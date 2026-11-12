# nem-ecommerce

Retail & wholesale storefront plus back office (orders, stock, delivery, payments, expenses, P&L)
for a Cambodian nem business. Next.js 16 · TypeScript · Tailwind 4 · shadcn/ui · Prisma 7 · PostgreSQL · Auth.js.

Design and roadmap: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Store name and branding

The shop name is **not hardcoded**. It is read from `system_settings` on every request
(`src/features/settings/branding.ts`), so the business can be renamed — or the platform reused for
another shop — without a code change or deploy:

| Setting key | Example |
|---|---|
| `business.name` | `{"km": "ណែមបាត់ដំបង", "en": "Nem Battambang"}` |
| `business.tagline` | `{"km": "…", "en": "Handmade nem…"}` (hero text, footer, meta description) |
| `business.logoUrl` | image URL, or `null` to use the built-in illustration |
| `business.phone` / `business.facebook` / `business.telegram` | footer + contact page; empty hides the link |

UI strings may use `{brand}` as a placeholder (see `home.heroTitle` in `src/i18n/dictionaries.ts`).
The Settings admin page (Phase 6) will edit these; until then use `npm run db:studio`.

## Local development

Needs Node 24+ and Docker.

```bash
cp .env.example .env          # then fill POSTGRES_PASSWORD, DATABASE_URL, AUTH_SECRET, SEED_ADMIN_PASSWORD
npm install
docker compose -f docker-compose.dev.yml --env-file .env up -d --wait   # Postgres on 127.0.0.1:5433
npx prisma migrate dev        # applies migrations + generates the client
npx prisma db seed            # DEMO data + admin user from SEED_ADMIN_*
npm run dev                   # http://localhost:3000
```

Generate `AUTH_SECRET` with `npx auth secret`.

| Command | What it does |
|---|---|
| `npm run dev` | dev server |
| `npm test` | unit tests (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run build` | production build (standalone output) |
| `npm run db:migrate` | create/apply a dev migration |
| `npm run db:seed` | re-run the idempotent demo seed |
| `npm run db:studio` | Prisma Studio |

**Seed data is demo data.** Every seeded customer, batch and price is fictional or a sample from
the spec, marked "(demo)" where it is visible.

## Production (Ubuntu VPS)

```bash
git clone <repo> /opt/nem && cd /opt/nem
cp .env.example .env && nano .env          # strong secrets; DATABASE_URL is overridden in compose
docker compose up -d --build               # db → migrate (prisma migrate deploy) → app → nginx
docker compose run --rm migrate npx prisma db seed   # first install only
```

- Only Nginx publishes ports (80/443). Postgres and the app sit on the internal network.
- Health: `GET /api/health` (checks the DB); the app container has a Docker healthcheck.
- TLS: add certbot certificates and a 443 server block to `docker/nginx/nginx.conf`.

### Backup & restore

```bash
docker compose exec db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > /backups/nem-$(date +%F).dump'
docker compose exec db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists /backups/<file>.dump'
```

`./backups` on the host is mounted at `/backups` in the db container. Copy it off the server regularly.
