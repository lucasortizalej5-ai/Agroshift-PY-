FROM node:22-bookworm-slim AS web-build
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    npm ci --no-audit --no-fund --fetch-retries=1 --fetch-timeout=45000
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends libstdc++6 && rm -rf /var/lib/apt/lists/*
COPY --from=web-build /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export PIP_CERT=/run/secrets/build_ca; fi; \
    pip install --no-cache-dir -r backend/requirements.txt
COPY --chown=10001:10001 backend/app /app/backend/app
COPY --chown=10001:10001 scripts/run_container.py /app/scripts/run_container.py
COPY --chown=10001:10001 frontend/server.mjs frontend/ssr-utils.mjs frontend/package.json /app/frontend/
COPY --from=web-build --chown=10001:10001 /build/frontend/node_modules /app/frontend/node_modules
COPY --from=web-build --chown=10001:10001 /build/frontend/dist /app/frontend/dist
RUN useradd --uid 10001 --create-home agroshift && mkdir /data && chown agroshift:agroshift /data
USER agroshift
ENV APP_ENV=production HOST=0.0.0.0 PORT=8080 API_BASE_URL=http://127.0.0.1:8000 DATABASE_PATH=/data/agroshift.sqlite3 PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.getenv('PORT','8080')+'/healthz', timeout=3)"
CMD ["python", "/app/scripts/run_container.py"]
