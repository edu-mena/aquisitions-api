# Docker Setup — Aquisitions API

This project supports two Docker environments:

| Environment | Database          | Compose file                |
|-------------|-------------------|-----------------------------|
| Development | Neon Local proxy  | `docker-compose.dev.yml`    |
| Production  | Neon Cloud        | `docker-compose.prod.yml`   |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- A [Neon](https://neon.tech) account with a project created
- **Mac users:** in Docker Desktop → Settings → General, switch from *VirtioFS* to **gRPC FUSE**

---

## Development (Neon Local)

Neon Local is a local proxy that connects to your real Neon project and **automatically creates an ephemeral branch** for development. The branch is deleted when the container stops.

### 1. Configure `.env.development`

Copy and fill in your values:

```sh
cp .env.development .env.development.local   # optional personal override
```

Open `.env.development` and set:

| Variable          | Where to find it                                          |
|-------------------|-----------------------------------------------------------|
| `NEON_API_KEY`    | Neon Console → Account → API Keys                        |
| `NEON_PROJECT_ID` | Neon Console → Project Settings → General                |
| `ARCJET_KEY`      | [app.arcjet.com](https://app.arcjet.com)                 |
| `JWT_SECRET`      | Any random string (for dev, anything works)              |

> `DATABASE_URL`, `NEON_LOCAL`, and `NEON_LOCAL_HOST` are pre-filled and point
> to the Neon Local container — **do not change them**.

### 2. Start the stack

```sh
docker compose -f docker-compose.dev.yml up --build
```

What happens on startup:
1. `neon-local` pulls the Neon Local image and connects to your Neon project
2. An ephemeral branch is created automatically
3. The `app` waits for `neon-local` to be healthy
4. Migrations run (`scripts/migrate.js`)
5. The API starts with `node --watch` (hot-reload on `src/` changes)

### 3. Verify it's working

```sh
curl http://localhost:3000/health   # or whatever your health endpoint is
```

Logs from both services stream to the terminal. Press `Ctrl+C` to stop — the ephemeral branch is deleted automatically.

### Hot-reload

The `./src` directory is mounted into the container. Saving any file under `src/` triggers `node --watch` to restart the process automatically. No rebuild needed.

### Keeping the branch between restarts

By default `DELETE_BRANCH=true` (Neon Local default) — the branch is wiped when the container stops. To persist it across restarts, add to the `neon-local` service in `docker-compose.dev.yml`:

```yaml
environment:
  DELETE_BRANCH: "false"
```

---

## Production (Neon Cloud)

### 1. Configure `.env.production`

```sh
# Never commit this file — it is gitignored
```

Open `.env.production` and replace every placeholder:

| Variable       | Where to find it                                              |
|----------------|---------------------------------------------------------------|
| `DATABASE_URL` | Neon Console → Connection Details (use the **pooled** string) |
| `JWT_SECRET`   | Generate: `openssl rand -base64 32`                          |
| `ARCJET_KEY`   | [app.arcjet.com](https://app.arcjet.com) (prod project)      |

### 2. Build and start

```sh
docker compose -f docker-compose.prod.yml up --build -d
```

Migrations run automatically before the app process starts.

### 3. View logs

```sh
docker compose -f docker-compose.prod.yml logs -f app
```

### 4. Stop

```sh
docker compose -f docker-compose.prod.yml down
```

---

## Environment Variables Reference

| Variable           | Dev default                                    | Production              |
|--------------------|------------------------------------------------|-------------------------|
| `PORT`             | `3000`                                         | `3000`                  |
| `NODE_ENV`         | `development`                                  | `production`            |
| `LOG_LEVEL`        | `debug`                                        | `info`                  |
| `DATABASE_URL`     | `postgres://neon:npg@neon-local:5432/neondb`   | Your Neon Cloud URL     |
| `NEON_LOCAL`       | `true`                                         | _(not set)_             |
| `NEON_LOCAL_HOST`  | `neon-local`                                   | _(not set)_             |
| `NEON_API_KEY`     | Your Neon API key                              | _(not needed)_          |
| `NEON_PROJECT_ID`  | Your Neon project ID                           | _(not needed)_          |
| `JWT_SECRET`       | Any dev string                                 | Strong random secret    |
| `JWT_EXPIRES_IN`   | `1d`                                           | `1d`                    |
| `ARCJET_KEY`       | Dev Arcjet key                                 | Prod Arcjet key         |
| `ARCJET_ENV`       | `development`                                  | `production`            |

---

## How the DATABASE_URL switches

```
Dev  →  postgres://neon:npg@neon-local:5432/neondb   (Neon Local proxy)
Prod →  postgres://<user>:<pw>@<ep>.neon.tech/<db>   (Neon Cloud)
```

The Neon serverless driver normally uses HTTPS/WebSocket to reach Neon Cloud.
When `NEON_LOCAL=true`, `src/config/database.js` reconfigures the driver to use
plain HTTP against the local proxy — no code path changes required for the rest
of the application.

---

## Running Migrations Manually

```sh
# Dev
docker compose -f docker-compose.dev.yml exec app node scripts/migrate.js

# Prod
docker compose -f docker-compose.prod.yml exec app node scripts/migrate.js
```

To generate a new migration after changing a model:

```sh
# Run outside Docker (uses your local .env)
npm run db:generate
```

Then rebuild the image so the new migration file is included:

```sh
docker compose -f docker-compose.dev.yml up --build
```

---

## File Overview

```
Dockerfile                 — Single-stage Node 22 Alpine image
docker-entrypoint.sh       — Runs migrations then execs CMD
docker-compose.dev.yml     — App + Neon Local for development
docker-compose.prod.yml    — App only, Neon Cloud via env vars
.dockerignore              — Excludes node_modules, .env files, logs
.env.development           — Dev secrets (gitignored)
.env.production            — Prod secrets (gitignored)
scripts/migrate.js         — Programmatic Drizzle migrator (no drizzle-kit CLI needed)
src/config/database.js     — Neon driver config, handles local vs cloud automatically
```
