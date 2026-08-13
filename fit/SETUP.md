# pg / fit — setup

## 1. supabase (5 min)
1. Open your existing project (same one as the dashboard) → SQL Editor.
2. Open `setup.sql`. Before running:
   - replace `CHANGE-ME-to-a-long-random-secret` with a long random string (keep it somewhere)
   - replace `YOUR-USER-UUID` with your user id: Authentication → Users → copy the id of your account
3. Run it. Done — tables, RLS, and the steps endpoint exist.

The app signs in with the same email/password user your dashboard uses.

## 2. deploy (5 min)
- Push this folder to a GitHub repo → import in Vercel → deploy. That's it, it's static.
- Or drag the folder into vercel.com/new.
- Optional: point fit.patrickgordon.ie at it (Vercel → Domains).

## 3. iPhone
Open the URL in Safari → Share → Add to Home Screen. Sign in once; it stays signed in.

## 4. mac
Open the URL in Safari → File → Add to Dock.

## 5. steps shortcut (10 min, do once)
Build one shortcut called "log steps":
1. **Find Health Samples** — type: Steps, Start Date: is today, sort: none
2. **Calculate Statistics** on Health Samples → Sum
3. **Get Contents of URL**
   - URL: `https://lyimgdrfofmukylbmyqk.supabase.co/rest/v1/rpc/fit_log_steps`
   - Method: POST
   - Headers:
     - `apikey`: your publishable key (the one in supabase.js)
     - `Authorization`: `Bearer ` + the same publishable key
     - `Content-Type`: `application/json`
   - Request Body (JSON):
     - `p_secret`: your secret from setup.sql
     - `p_steps`: (variable → Calculation Result)

Then Automations tab → 8 personal automations at 8:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00 → each runs "log steps" → **Run Immediately** (no confirmation).

First run will ask for Health access — allow Steps read.

## dashboard integration (later)
Your patrickgordon.ie dashboard uses the same Supabase project, so it can read
`fit_days`, `fit_food_log`, `fit_workouts`, `fit_events` directly once signed in.
One query each and today's stats are on the dashboard overview panel.
