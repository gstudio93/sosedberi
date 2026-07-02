# Deploy to Russian VPS

This is the first migration stage: Next.js runs on a VPS, while Supabase Auth, database, Realtime and Storage stay unchanged.

## 1. Server

Recommended MVP server:

- Ubuntu 24.04 LTS
- 2 vCPU / 4 GB RAM for a small test
- 4 vCPU / 8 GB RAM for a comfortable MVP

Install Docker and Docker Compose plugin on the server.

## 2. Environment

Create `.env.production` from the example:

```bash
cp .env.example .env.production
```

Fill values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=
```

Important: `NEXT_PUBLIC_*` values are baked into the client bundle during `docker compose build`, so rebuild the image after changing them.

## 3. Build and run

```bash
docker compose --env-file .env.production up -d --build
```

The app listens on `127.0.0.1:3000`. Put Nginx or Caddy in front of it for HTTPS.

## 4. Nginx example

```nginx
server {
    server_name sosedberi.ru www.sosedberi.ru;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then issue SSL with Certbot.

## 5. Update deploy

```bash
git pull
docker compose --env-file .env.production up -d --build
```

## Later migration stages

1. Move item and avatar uploads from Supabase Storage to S3-compatible storage.
2. Move database to managed PostgreSQL or self-hosted PostgreSQL.
3. Replace Supabase Auth and Realtime only after the app is stable on the VPS.
