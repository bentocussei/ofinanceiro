#!/usr/bin/env python3
"""
O Financeiro — Offsite database backup to Backblaze B2.

Runs as a Railway cron job. Streams pg_dump output through gzip into
B2 object storage with a date-stamped key. Keeps backups completely
independent from Railway so we can recover even if the Railway account
is compromised.

Required environment variables (set in Railway cron service):
    DATABASE_URL          postgres://... (production DB, public proxy or internal)
    B2_KEY_ID             Backblaze B2 application key id
    B2_APPLICATION_KEY    Backblaze B2 application key secret
    B2_BUCKET             Bucket name (e.g. ofinanceiro-backups)
    BACKUP_PREFIX         Optional folder prefix inside the bucket (default: db/)
    SENTRY_DSN            Optional — report failures

Locally for ad-hoc backups:
    pip install b2sdk
    DATABASE_URL=... B2_KEY_ID=... B2_APPLICATION_KEY=... B2_BUCKET=... \\
        python scripts/backup_to_b2.py
"""

from __future__ import annotations

import gzip
import io
import os
import shlex
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def fail(msg: str, code: int = 1) -> None:
    print(f"[backup] FAIL: {msg}", file=sys.stderr, flush=True)
    sys.exit(code)


def info(msg: str) -> None:
    print(f"[backup] {msg}", flush=True)


def main() -> None:
    db_url = os.environ.get("DATABASE_URL", "").strip()
    b2_key_id = os.environ.get("B2_KEY_ID", "").strip()
    b2_app_key = os.environ.get("B2_APPLICATION_KEY", "").strip()
    b2_bucket = os.environ.get("B2_BUCKET", "").strip()
    prefix = os.environ.get("BACKUP_PREFIX", "db/").strip("/")
    if prefix:
        prefix = f"{prefix}/"
    sentry_dsn = os.environ.get("SENTRY_DSN", "").strip()

    missing = [
        name
        for name, value in [
            ("DATABASE_URL", db_url),
            ("B2_KEY_ID", b2_key_id),
            ("B2_APPLICATION_KEY", b2_app_key),
            ("B2_BUCKET", b2_bucket),
        ]
        if not value
    ]
    if missing:
        fail(f"missing required env vars: {', '.join(missing)}")

    # Optional Sentry init for failure reporting
    if sentry_dsn:
        try:
            import sentry_sdk

            sentry_sdk.init(dsn=sentry_dsn, environment=os.environ.get("ENVIRONMENT", "production"))
        except Exception as e:
            info(f"sentry init failed (continuing): {e}")

    # Verify pg_dump is on PATH
    try:
        version = subprocess.check_output(["pg_dump", "--version"], text=True).strip()
        info(f"pg_dump available: {version}")
    except FileNotFoundError:
        fail("pg_dump binary not found on PATH — install postgresql-client in the runner image")
    except subprocess.CalledProcessError as e:
        fail(f"pg_dump --version exited with {e.returncode}")

    # Verify b2sdk
    try:
        from b2sdk.v2 import B2Api, InMemoryAccountInfo
    except ImportError:
        fail("b2sdk not installed — add 'b2sdk' to the cron service requirements")

    # Build the backup key
    now = datetime.now(timezone.utc)
    env = os.environ.get("ENVIRONMENT", "production")
    key = f"{prefix}{env}/{now.strftime('%Y/%m')}/{env}_{now.strftime('%Y%m%d_%H%M%S')}.dump.gz"

    info(f"target: b2://{b2_bucket}/{key}")

    # Run pg_dump → stream into gzip → buffer in memory
    # For very large databases (>500MB) this should be replaced by chunked
    # streaming directly to B2 large file API. For now (early stage) the
    # buffered approach is fine and dramatically simpler.
    info("running pg_dump (custom format)...")
    try:
        proc = subprocess.Popen(
            ["pg_dump", "-F", "c", db_url],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        raw, err = proc.communicate(timeout=600)
    except subprocess.TimeoutExpired:
        proc.kill()
        fail("pg_dump timed out after 10 minutes")
    if proc.returncode != 0:
        fail(f"pg_dump exited with {proc.returncode}: {err.decode('utf-8', errors='replace')[:500]}")

    raw_size = len(raw)
    if raw_size == 0:
        fail("pg_dump produced an empty file")

    info(f"pg_dump output: {raw_size:,} bytes (custom format, already compressed)")

    # pg_dump custom format is already compressed. Skip extra gzip — would just add CPU.
    payload = raw

    # Authenticate with B2 and upload
    info("authenticating with B2...")
    info_store = InMemoryAccountInfo()
    api = B2Api(info_store)
    api.authorize_account("production", b2_key_id, b2_app_key)
    bucket = api.get_bucket_by_name(b2_bucket)

    info(f"uploading {len(payload):,} bytes to {key}...")
    bucket.upload_bytes(
        data_bytes=payload,
        file_name=key,
        content_type="application/octet-stream",
        file_info={
            "source": "ofinanceiro-backup",
            "environment": env,
            "created_at": now.isoformat(),
            "pg_dump_version": version,
        },
    )

    info(f"OK uploaded {len(payload):,} bytes to b2://{b2_bucket}/{key}")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        try:
            import sentry_sdk

            sentry_sdk.capture_exception(e)
        except Exception:
            pass
        fail(f"uncaught error: {e}")
