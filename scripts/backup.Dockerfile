# Lightweight image for the daily Postgres → B2 backup cron service.
# Includes PostgreSQL 18 client (pg_dump) and the Python backup script.
FROM python:3.13-slim

# Install pg_dump 18 (matches Railway's postgres-ssl:18 image)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates gnupg lsb-release \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/keyrings/postgres.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/postgres.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client-18 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY scripts/backup_requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY scripts/backup_to_b2.py /app/backup_to_b2.py

# Default command — Railway cron schedule will trigger this on its cadence.
CMD ["python", "-u", "/app/backup_to_b2.py"]
