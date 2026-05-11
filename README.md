# Brightaxe Starforge

A Next.js tabletop campaign dashboard for Taark Brightaxe's forge economy, monthly resolution, and shared DM access.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If shared storage is not configured, the app falls back to browser `localStorage` so local playtesting still works.

## Shared Online Mode

The deployed app uses:

- Vercel for hosting
- Upstash Redis for the shared campaign JSON
- A simple app passcode stored in Vercel environment variables

Required environment variables:

```bash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
STARFORGE_PASSCODE=
STARFORGE_SESSION_SECRET=
STARFORGE_CAMPAIGN_KEY=campaign:brightaxe
```

`STARFORGE_SESSION_SECRET` should be a long random string. `STARFORGE_CAMPAIGN_KEY` is optional unless you want to rename the Redis key.

## Deploying to Vercel

1. Push the `brightaxe-starforge` folder as the app root in GitHub.
2. Import the repo in Vercel and confirm the root directory is `brightaxe-starforge` if using a larger parent repo.
3. Add Upstash Redis from the Vercel Marketplace so Redis env vars are injected.
4. Add `STARFORGE_PASSCODE` and `STARFORGE_SESSION_SECRET` in Vercel Project Settings.
5. Deploy a preview and verify login, campaign load/save, and the music/static assets.

Build command:

```bash
npm run build
```

## Verification

```bash
npm run test
npm run lint
npm run build
```
