#!/usr/bin/env bash
# =====================================================================
#  Sidvin Celeste — download every remote image into assets/images
#  and repoint index.html / thank-you.html at the local copies.
#
#  Run from the project root:   bash scripts/localise-assets.sh
#  Requires: curl, grep, python3
#
#  Safe to re-run.
# =====================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMG_DIR="$ROOT/assets/images"
PAGES=(index.html thank-you.html)
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

mkdir -p "$IMG_DIR"

FILES=()
for p in "${PAGES[@]}"; do [ -f "$ROOT/$p" ] && FILES+=("$ROOT/$p"); done

# og:image is deliberately left absolute (see the rewrite step), so strip that
# line before scanning — no point downloading a file we will not point at.
URLS=$(sed 's|<meta property="og:image"[^>]*>||g' "${FILES[@]}" \
        | grep -ohE 'https://sidvinceleste\.com/wp-content/uploads/[^"'"'"' )]+' | sort -u || true)

if [ -z "$URLS" ]; then
  echo "Nothing to do - no remote image URLs found (already localised?)."
  exit 0
fi

echo "Found $(echo "$URLS" | wc -l | tr -d ' ') remote assets."
echo

OK=0; FAIL=0
MAPFILE="$(mktemp)"

while IFS= read -r u; do
  [ -z "$u" ] && continue
  file="$(basename "${u%%\?*}")"
  dest="$IMG_DIR/$file"

  if [ -s "$dest" ]; then
    echo "  = $file (already here)"
    printf '%s\t%s\n' "$u" "assets/images/$file" >> "$MAPFILE"
    OK=$((OK+1)); continue
  fi

  if curl -fsSL --max-time 90 -A "$UA" -o "$dest" "$u"; then
    echo "  + $file  ($(du -k "$dest" | cut -f1) KB)"
    printf '%s\t%s\n' "$u" "assets/images/$file" >> "$MAPFILE"
    OK=$((OK+1))
  else
    echo "  ! FAILED $file"
    rm -f "$dest"
    FAIL=$((FAIL+1))
  fi
done <<< "$URLS"

# Rewrite with python so the replacement is literal (no regex escaping traps)
# and so og:image keeps its absolute URL — a relative og:image breaks link
# previews on WhatsApp and Facebook.
python3 - "$MAPFILE" "$ROOT" "${PAGES[@]}" <<'PY'
import sys, re, io, os
mapfile, root = sys.argv[1], sys.argv[2]
pages = sys.argv[3:]

pairs = []
with open(mapfile, encoding='utf-8') as fh:
    for line in fh:
        if '\t' in line:
            a, b = line.rstrip('\n').split('\t', 1)
            pairs.append((a, b))

OG = re.compile(r'<meta property="og:image"[^>]*>')
for p in pages:
    path = os.path.join(root, p)
    if not os.path.exists(path):
        continue
    s = open(path, encoding='utf-8').read()
    og = OG.search(s)
    og = og.group(0) if og else None
    for a, b in pairs:
        s = s.replace(a, b)
    if og:
        s = OG.sub(lambda m: og, s)
    open(path, 'w', encoding='utf-8').write(s)
    print('Rewrote', p)
PY

rm -f "$MAPFILE"

echo
echo "Done. $OK downloaded or already present, $FAIL failed."
[ "$FAIL" -gt 0 ] && echo "Failed URLs were left pointing at the live site so nothing breaks."
echo "Reload index.html and check every image still appears."
exit 0
