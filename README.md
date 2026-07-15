# Daily Check-in

A personal daily symptom log, built as an installable PWA. Under 60 seconds, get in, get out. All data lives in your phone's local storage — nothing leaves the device until you tap **Export for Claude (CSV)**.

Nocturne skin: dark `#161826` ground, single blurple `#9184d9` accent, Inter + JetBrains Mono, outlined buttons.

## Files

- `index.html` / `style.css` / `app.js` — the whole app, no build step
- `sw.js` — service worker (offline support); **bump `CACHE_VERSION` whenever you change anything**, or phones will keep the old cached version
- `manifest.webmanifest` + `icons/` — home-screen install metadata

## Adding / removing fields

Everything derives from the arrays at the top of `app.js` (`STATE_FIELDS`, `BODY_FIELDS`, `STATE_TAGS`, `EX_TYPES`, `SUPPLEMENTS`, `CHIPS`). Edit one array entry and the form, storage, and CSV export all follow. Then bump `CACHE_VERSION` in `sw.js` and push.

## Deploy to GitHub Pages (one-time setup)

1. Create an empty repo on github.com (e.g. `health-checkin`). Public is fine — only the app code is public, never your data.
2. In Terminal:
   ```sh
   cd ~/Desktop/OPTIMIZE/health-checkin
   git remote add origin https://github.com/<your-username>/health-checkin.git
   git push -u origin main
   ```
3. On GitHub: repo → Settings → Pages → Source: "Deploy from a branch" → Branch: `main`, folder `/ (root)` → Save.
4. After a minute the app is live at `https://<your-username>.github.io/health-checkin/`.

Updates later: commit, push, bump `CACHE_VERSION` — done.

## Install on iPhone

1. Open the GitHub Pages URL in **Safari** on your phone.
2. Share button → **Add to Home Screen**.
3. Launch it from the home-screen icon — it runs full-screen and works offline from then on.

## The 8:30 PM reminder (iOS Shortcuts)

The app supports a deep link: `.../health-checkin/#checkin` opens straight to the form.

1. Shortcuts app → **Automation** tab → **+** → **Time of Day** → 8:30 PM, Daily → **Run Immediately** → Next.
2. Search for the **Open URLs** action, paste `https://<your-username>.github.io/health-checkin/#checkin`.
3. Done. Every evening at 8:30 the check-in form opens itself.

## Export → Claude

History → **↓ Export for Claude (CSV)**. On iPhone this opens the share sheet — send `symptoms.csv` straight to the Claude app (or Files/AirDrop). One row per logged day:

```
date, energy, sleep, mood, fueling, migraine, bleeding, exertion,
mood_state, exertion_type, supplements, symptoms, note
```
