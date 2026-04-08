#!/usr/bin/env python3
"""
O Financeiro — Offsite database backup to Cloudflare R2 (S3-compatible).

Runs as a Railway cron job. Runs pg_dump (custom format, already compressed)
and uploads the resulting object to R2 with a date-stamped key.

NOTE: R2 is in the same vendor "basket" as our live storage bucket. This is
a temporary early-stage choice — see docs/POST_LAUNCH_CHECKLIST.md item 13b
for the migration plan to a truly independent provider (Backblaze B2).

Required environment variables (set on the Railway cron service):
    DATABASE_URL          postgres://... (production DB)
    R2_ACCOUNT_ID         Cloudflare account id
    R2_ACCESS_KEY_ID      R2 access key id
    R2_SECRET_ACCESS_KEY  R2 secret access key
    R2_BUCKET             Bucket name (e.g. ofinanceiro-backups)
    R2_ENDPOINT           Optional — defaults to https://<account>.r2.cloudflarestorage.com
    BACKUP_PREFIX         Optional folder prefix inside the bucket (default: db/)
    ENVIRONMENT           production | staging (default: production)
    SENTRY_DSN            Optional — report failures
"""

from __future__ import annotations

import os
import subprocess
import sys
from datetime import datetime, timezone


def fail(msg: str, code: int = 1) -> None:
    print(f"[backup] FAIL: {msg}", file=sys.stderr, flush=True)
    sys.exit(code)


def info(msg: str) -> None:
    print(f"[backup] {msg}", flush=True)


def main() -> None:
    db_url = os.environ.get("DATABASE_URL", "").strip()
    account_id = os.environ.get("R2_ACCOUNT_ID", "").strip()
    access_key = os.environ.get("R2_ACCESS_KEY_ID", "").strip()
    secret_key = os.environ.get("R2_SECRET_ACCESS_KEY", "").strip()
    bucket_name = os.environ.get("R2_BUCKET", "").strip()
    endpoint = os.environ.get("R2_ENDPOINT", "").strip()
    prefix = os.environ.get("BACKUP_PREFIX", "db/").strip("/")
    if prefix:
        prefix = f"{prefix}/"
    env = os.environ.get("ENVIRONMENT", "production").strip()
    sentry_dsn = os.environ.get("SENTRY_DSN", "").strip()

    missing = [
        name
        for name, value in [
            ("DATABASE_URL", db_url),
            ("R2_ACCESS_KEY_ID", access_key),
            ("R2_SECRET_ACCESS_KEY", secret_key),
            ("R2_BUCKET", bucket_name),
        ]
        if not value
    ]
    if missing:
        fail(f"missing required env vars: {', '.join(missing)}")

    if not endpoint:
        if not account_id:
            fail("either R2_ENDPOINT or R2_ACCOUNT_ID must be set")
        endpoint = f"https://{account_id}.r2.cloudflarestorage.com"

    if sentry_dsn:
        try:
            import sentry_sdk

            sentry_sdk.init(dsn=sentry_dsn, environment=env)
        except Exception as e:
            info(f"sentry init failed (continuing): {e}")

    try:
        version = subprocess.check_output(["pg_dump", "--version"], text=True).strip()
        info(f"pg_dump available: {version}")
    except FileNotFoundError:
        fail("pg_dump binary not found on PATH — install postgresql-client in the runner image")
    except subprocess.CalledProcessError as e:
        fail(f"pg_dump --version exited with {e.returncode}")

    try:
        import boto3
        from botocore.config import Config
    except ImportError:
        fail("boto3 not installed — add 'boto3' to backup_requirements.txt")

    now = datetime.now(timezone.utc)
    key = f"{prefix}{env}/{now.strftime('%Y/%m')}/{env}_{now.strftime('%Y%m%d_%H%M%S')}.dump"

    info(f"target: s3://{bucket_name}/{key} via {endpoint}")

    info("running pg_dump (custom format)...")
    try:
        proc = subprocess.Popen(
            ["pg_dump", "-F", "c", db_url],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        raw, err = proc.communicate(timeout=900)
    except subprocess.TimeoutExpired:
        proc.kill()
        fail("pg_dump timed out after 15 minutes")
    if proc.returncode != 0:
        fail(f"pg_dump exited with {proc.returncode}: {err.decode('utf-8', errors='replace')[:500]}")

    raw_size = len(raw)
    if raw_size == 0:
        fail("pg_dump produced an empty file")

    info(f"pg_dump output: {raw_size:,} bytes (custom format, already compressed)")

    client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="auto",
        config=Config(signature_version="s3v4", retries={"max_attempts": 3, "mode": "standard"}),
    )

    info(f"uploading {raw_size:,} bytes to {key}...")
    client.put_object(
        Bucket=bucket_name,
        Key=key,
        Body=raw,
        ContentType="application/octet-stream",
        Metadata={
            "source": "ofinanceiro-backup",
            "environment": env,
            "created-at": now.isoformat(),
            "pg-dump-version": version,
        },
    )

    info(f"OK uploaded {raw_size:,} bytes to s3://{bucket_name}/{key}")


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
