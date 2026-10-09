#!/usr/bin/env bash
# Lighthouse 13 по собранному сайту (нужен npm run preview -- --port 4788).
# 3 прогона на страницу и форм-фактор; в docs/lighthouse/ сохраняется медианный отчёт (JSON + HTML).
set -euo pipefail
export CHROME_PATH="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT=docs/lighthouse
mkdir -p "$OUT"
BASE="${QA_BASE:-http://localhost:4788/}"
for form in mobile desktop; do
  for lang in ru en; do
    url="$BASE"; [ "$lang" = en ] && url="${BASE}en/"
    preset=""; [ "$form" = desktop ] && preset="--preset=desktop"
    for i in 1 2 3; do
      npx -y lighthouse@13.5.0 "$url" --quiet $preset --chrome-flags="--headless=new" \
        --only-categories=performance,accessibility,best-practices,seo \
        --output=json --output=html --output-path="$OUT/.run-$form-$lang-$i" >/dev/null 2>&1
    done
    python3 - "$OUT" "$form" "$lang" <<'PY'
import json, shutil, sys, statistics
out, form, lang = sys.argv[1:4]
runs = []
for i in (1, 2, 3):
    d = json.load(open(f"{out}/.run-{form}-{lang}-{i}.report.json"))
    runs.append((d["categories"]["performance"]["score"], i, d))
runs.sort(key=lambda r: r[0])
_, i, d = runs[1]
for ext in ("json", "html"):
    shutil.copy(f"{out}/.run-{form}-{lang}-{i}.report.{ext}", f"{out}/{form}-{lang}.report.{ext}")
a = d["audits"]; c = d["categories"]
scores = {k: round(v["score"] * 100) for k, v in c.items()}
print(f"{form}-{lang}: {scores} LCP {a['largest-contentful-paint']['displayValue']} CLS {a['cumulative-layout-shift']['displayValue']} TBT {a['total-blocking-time']['displayValue']} (perf по прогонам: {[round(r[0]*100) for r in runs]})")
PY
    rm -f "$OUT"/.run-"$form"-"$lang"-*
  done
done
