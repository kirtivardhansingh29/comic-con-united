# Comic Con United — Live Quiz (standalone deployable app)

A fan-run, mobile-first live quiz for the Delhi Comic Con 2026 activity.
~50 players join on their phones with name + phone, a host runs the game
with a PIN, and the Top 3 win a **Chance to Win Free Passes for Day 1**.

This is a fresh, standalone Next.js app — it has no dependency on any
Muse artifact runtime and deploys to Vercel as-is.

## What is inside

- **Home** — comic-cover hero, prize strip, 8-hero character gallery,
  event details, and the official Comic Con India logo shown **only** as an
  information card inside Event Details (never as branding).
- **Live Quiz** (`/live`) — join → lobby → 15 questions (20s each) → reveal
  + leaderboard after every question → Top 3 podium with confetti.
  Scoring is computed on the server: correct = 600 + up to 400 speed bonus.
  The correct answer is never sent to a browser before the reveal phase.
  During a question, players also see a **Live Ranking** (top 5 + their own
  row) that updates on every poll — scores move the moment an answer lands.
- **Host panel** (`/host`) — first use sets a 4–6 digit PIN (stored hashed
  in Redis). The same PIN unlocks start / reveal / next / finish / clear,
  the participants export (copy-text + CSV) and the proof report.
  Live controls: **Pause / Resume** (the question clock freezes server-side
  and players keep their remaining seconds), **Skip question**, **End quiz
  anytime** (straight to the podium), and **remove player** (✕ next to each
  name in the host's player list).
- **Proof report** (`/report`) — PIN-gated, print/screenshot-friendly:
  activity, host (Vitthal Diwedi), event, date, participants, questions
  played, total answers, Top 3 with name + phone + score. Made to be shown
  to Comic Con officials as proof.
- **Arena mode** (`/arena`) — fully local, one-device host-run games
  (6 rounds, localStorage scoreboard, no-repeat picker, podium + export).

Design: Comic-Panel Neo-Brutalism — off-white paper + halftone dots, 4px
black borders, hard offset shadows, flat red/yellow/blue, Anton + Archivo.

## Tech

- Next.js 15 (App Router) + TypeScript
- Room state in **Upstash Redis** via `@upstash/redis` (24h TTL), split
  into structures with atomic per-player writes — a participants hash, a
  phone→id hash for rejoin dedupe, a scores hash (`HINCRBY`), a per-question
  answers hash (`HSETNX` is the answer lock) and an `INCR` answer counter —
  so 50 simultaneous joins/answers cannot overwrite each other. Clients
  poll `/api/state` every 1 second — no websockets.
- If the Upstash env vars are missing (local dev only), the app falls back
  to a single-process in-memory store so you can smoke-test. **Never run a
  real event without Upstash** — serverless instances do not share memory.

## Local run

```bash
npm install
cp .env.example .env.local   # fill in Upstash values, or leave blank for the in-memory fallback
npm run dev                  # http://localhost:3000
npm run build && npm start   # production check
```

## Deploy — GitHub + Vercel + Upstash (exact steps)

These steps need the owner's own GitHub and Vercel sign-in.

1. **Push to GitHub**
   ```bash
   cd comic-con-united-app
   git init
   git add .
   git commit -m "Comic Con United — live quiz app"
   git branch -M main
   git remote add origin https://github.com/<your-username>/comic-con-united-app.git
   git push -u origin main
   ```
2. **Import into Vercel** — vercel.com → Add New → Project → import the
   repo. Framework preset: Next.js (auto-detected). No build settings to
   change. Deploy once.
3. **Add Upstash Redis** — in the Vercel project: **Storage** tab →
   Create Database → **Upstash for Redis** (via the Vercel Marketplace) →
   create a database (region: pick the one closest to your users, e.g.
   Mumbai / ap-south if offered). Connecting it to the project
   automatically sets the env vars `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN`.
   - Alternative: create the database at upstash.com and paste both values
     manually under Project → Settings → Environment Variables.
4. **Redeploy** — Deployments tab → ⋯ → Redeploy, so the new env vars take
   effect.
5. **First run** — open the live URL → `/host` → set the host PIN (4–6
   digits). Share the site link with players; they join at `/live`.
   Winners: use `/host` export for the Google Form list and `/report` as
   the proof screenshot for officials.

## Game-day checklist

- Host opens `/host` first and sets/uses the PIN. **Never share the PIN** —
  it is the only admin key.
- Players join at `/live` with the exact name + 10-digit phone (winners are
  identified by this at the venue, so spellings matter).
- Host flow per question: Start → (players answer in 20s) → Reveal →
  Next → … → Finish shows the podium.
- After the game: export the list (Google Form), screenshot the report.
- Wrong room state? Host panel → "Room clear karo" resets players/scores
  and keeps the same PIN.
