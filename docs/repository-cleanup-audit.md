# Repository Cleanup Audit - D:\Gallery (main)

## Scope
Checked: logs, temp files, downloads, cookies, zip archives, node_modules, stitch-* artifacts, env files, scripts, docs.

## Group A - Safe to remove (clear)
- app/src/logs/app.log (runtime log, regenerated)
- nginx/logs/access.log (runtime log)
- nginx/logs/error.log (runtime log)
- stitch_modern_photo_gallery_system.zip (large download artifact, not referenced)
- cookies.txt, cookies2.txt, cookies3.txt, cookies_admin.txt (sensitive/browser artifacts)
- download_photos.js (utility script, not referenced in compose/code)
- setup-vmware.sh (utility script, not referenced)

## Group B - Consider removal (confirm)
- node_modules/ (root) - if not used by tooling in repo; app/node_modules tracked? but node_modules usually not committed; check .gitignore - node_modules present. Large. Not needed for compose runtime.
- app/node_modules - same
- stitch-design/, stitch-extracted/ - design artifacts, not referenced in code/config/docs
- query_loki.sh - utility, referenced in README? README shows example LogQL, not directly using this script; can keep or remove

## Group C - Must keep
- docker-compose.yml, nginx/, prometheus/, grafana/, loki/, promtail/, healthcheck/, app/, db/, .env.example, .gitignore, README.md, detai.md, yeucau.md, docs/*.md, docs/*.docx, docs/evidence/

## Recommendations
Remove Group A. Consider removing stitch-* and large root node_modules if not needed for doc generation. query_loki.sh optional.
