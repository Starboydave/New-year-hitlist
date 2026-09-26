# New Year Hit List

A cyberpunk-styled New Year's resolution tracker. Add your targets, mark them
terminated, and watch the mission-completion bar fill up. Sit idle too long
with active targets and the system goes **CRITICAL** — the screen shakes and a
warning won't leave until you promise you're working on it.

## Run it

It's a static site with no build step or dependencies:

- Open `index.html` directly in a browser, or
- Serve the folder locally: `python3 -m http.server` → http://localhost:8000
- Deploy anywhere static (GitHub Pages: *Settings → Pages → Deploy from branch*, root folder).

## Features

- Add, complete, and delete targets (saved in your browser's `localStorage`)
- Live completion percentage and progress bar
- Countdown to midnight on every active bounty
- Idle "stagnation" nag after 30 seconds of inactivity (change `NAG_DELAY_MS` in `app.js`)
- Works on mobile; respects `prefers-reduced-motion`

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page markup |
| `styles.css` | Cyberpunk styling and animations |
| `app.js` | App logic: targets, persistence, countdown, nag timer |
| `react/CyberpunkHitList.jsx` | The original React + Tailwind component this site is based on |
