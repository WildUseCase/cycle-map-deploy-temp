# Cycle Map

Private source for the live Cloudflare Worker.

**Live site:** https://cycle-map-qqpu7k0y.kaylasheac.workers.dev

## Frozen (5pm, Aug 25 2026)

This repo matches the live site: Cloudflare Worker **v118** (`2026-08-24-v118-support-select`).

It stays on this version until you ask for a change. Changing the passcode in the Cloudflare dashboard is safe now — it will no longer swap in an older/broken worker.

Do **not** upload a different Worker in the Cloudflare dashboard unless you intend to replace the site.

## What’s in here

| File | What it is |
| --- | --- |
| `worker.js` | The entire app — page, tabs, API routes |
| `page.html` | The UI extracted from `worker.js` for editing |
| `wrangler.toml` | Worker name `cycle-map-qqpu7k0y` + D1 binding `cycle-map` |
| `extract.mjs` / `pagetool.py` | Pull the page out / fold it back in |
| `backup.py` | Snapshot the live timeline into `Backups/` |
| `Backups/` | Timeline snapshots (passcode is **not** in these files) |

The passcode lives as a Cloudflare Worker secret (`PASSCODE`). It is not in this repo.

## Edit and deploy

```
python3 pagetool.py out    # writes page.html
# edit page.html
python3 pagetool.py in     # folds it back into worker.js
python3 backup.py pre-deploy && npx wrangler deploy --config wrangler.toml
```

## Tabs

Timeline · The Bump Report · Little Ears · Mission Control · Family · Letters of Love

Newest timeline backup: `Backups/BACKUP_pre-exact-tree-deploy_20260824-043105.json`

- Title: Kayla's Pregnancy
- Day 1: 2026-08-20
- 43 steps
