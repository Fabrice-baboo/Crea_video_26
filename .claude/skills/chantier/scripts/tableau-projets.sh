#!/usr/bin/env bash
# tableau-projets.sh — Vue d'ensemble LECTURE SEULE d'un portefeuille de projets.
# Usage :
#   bash tableau-projets.sh <dossier_parent> [<autre_dossier> ...]
#   bash tableau-projets.sh --html portefeuille.html <dossier_parent> [...]
#
# Repère chaque projet via son .git ou son CLAUDE.md (dossiers donnés + sous-dossiers
# immédiats). Sort un tableau trié du PLUS NÉGLIGÉ au plus récent.
# Ne modifie aucun projet.

set -uo pipefail

HTML_OUT=""
if [ "${1:-}" = "--html" ]; then
  HTML_OUT="${2:-portefeuille.html}"
  shift 2
fi

if [ "$#" -eq 0 ]; then
  echo "Usage : bash tableau-projets.sh [--html out.html] <dossier_parent> [...]" >&2
  exit 1
fi

NOW="$(date +%s)"

# Format stat selon l'OS : BSD (macOS) = -f %m, GNU (Linux) = -c %Y.
if stat -f %m / >/dev/null 2>&1; then STAT=(stat -f %m); else STAT=(stat -c %Y); fi

# Collecte les candidats : chaque dossier donné + ses sous-dossiers immédiats.
candidats() {
  for racine in "$@"; do
    [ -d "$racine" ] || continue
    echo "$racine"
    for d in "$racine"/*/; do [ -d "$d" ] && echo "${d%/}"; done
  done
}

est_projet() { [ -d "$1/.git" ] || [ -f "$1/CLAUDE.md" ]; }

# mtime d'un fichier, portable (BSD stat -f / GNU stat -c).
mtime() {
  stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null || echo 0
}

# mtime du fichier le plus récent d'un projet. -prune empêche de DESCENDRE dans
# les dossiers lourds (sinon find traverse node_modules/.git même s'ils sont filtrés).
# stat est groupé par xargs (quelques process au lieu d'un par fichier) → rapide.
plus_recent() {
  find "$1" -maxdepth 4 \
    \( -name node_modules -o -name .git -o -name .next \
       -o -name dist -o -name build -o -name .venv \) -prune -o \
    -type f -print0 2>/dev/null \
  | xargs -0 "${STAT[@]}" 2>/dev/null \
  | sort -rn | head -1
}

# Première "prochaine étape" lue dans le CLAUDE.md (premier point sous le titre).
prochaine_etape() {
  local f="$1/CLAUDE.md"
  [ -f "$f" ] || { echo "—"; return; }
  awk '
    tolower($0) ~ /prochaines? [ée]tapes?/ {cap=1; next}
    cap && /^#/ {exit}
    cap && /^[[:space:]]*[-*0-9]/ {
      line=$0
      sub(/^[[:space:]]*([-*]|[0-9]+[.)])[[:space:]]*(\[[ xX]\][[:space:]]*)?/,"",line)
      if (length(line)>0){print line; exit}
    }' "$f" | cut -c1-60
}

# Lignes brutes : age_secondes \t reste...
LIGNES=""
while IFS= read -r p; do
  est_projet "$p" || continue
  nom="$(basename "$p")"

  if git -C "$p" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    ts="$(git -C "$p" log -1 --format=%ct 2>/dev/null || echo 0)"
    dernier="$(git -C "$p" log -1 --format='%cd' --date=short 2>/dev/null || echo '—')"
    wip="$([ -n "$(git -C "$p" status --porcelain 2>/dev/null)" ] && echo 'oui' || echo 'non')"
  else
    ts="$(plus_recent "$p")"; ts="${ts:-0}"
    dernier="$([ "$ts" -gt 0 ] && date -r "$ts" +%Y-%m-%d 2>/dev/null || echo '—')"
    wip="—"
  fi

  if [ "$ts" -gt 0 ]; then
    age=$(( (NOW - ts) / 86400 ))
  else
    age=999999
  fi
  mode="$([ -f "$p/CLAUDE.md" ] && echo REPRISE || echo AMORCE)"
  etape="$(prochaine_etape "$p")"; etape="${etape:-—}"

  LIGNES+="$age	$nom	$dernier	${age}j	$mode	$wip	$etape
"
done < <(candidats "$@" | sort -u)

LIGNES="$(printf '%s' "$LIGNES" | sed '/^$/d' | sort -t'	' -k1,1nr)"

if [ -z "$LIGNES" ]; then
  echo "Aucun projet trouvé (ni .git ni CLAUDE.md) dans : $*" >&2
  exit 0
fi

# ── Sortie HTML ─────────────────────────────────────────────────────────────
if [ -n "$HTML_OUT" ]; then
  {
    echo '<!doctype html><meta charset="utf-8"><title>Portefeuille</title>'
    echo '<style>body{font:14px system-ui,sans-serif;margin:2rem;background:#0f172a;color:#e2e8f0}'
    echo 'h1{font-size:1.3rem}table{border-collapse:collapse;width:100%}'
    echo 'th,td{padding:.5rem .7rem;border-bottom:1px solid #1e293b;text-align:left}'
    echo 'th{color:#94a3b8;font-weight:600}.dot{display:inline-block;width:.7rem;height:.7rem;border-radius:50%;margin-right:.5rem}'
    echo 'code{color:#93c5fd}</style>'
    echo '<h1>Portefeuille — du plus négligé au plus récent</h1><table>'
    echo '<tr><th></th><th>Projet</th><th>Dernier</th><th>Âge</th><th>Mode</th><th>WIP</th><th>Prochaine étape</th></tr>'
    while IFS='	' read -r age nom dernier agej mode wip etape; do
      if   [ "$age" -ge 60 ]; then col="#ef4444"
      elif [ "$age" -ge 21 ]; then col="#f59e0b"
      else col="#22c55e"; fi
      esc() { printf '%s' "$1" | sed 's/&/\&amp;/g;s/</\&lt;/g;s/>/\&gt;/g'; }
      printf '<tr><td><span class="dot" style="background:%s"></span></td><td><b>%s</b></td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td><code>%s</code></td></tr>\n' \
        "$col" "$(esc "$nom")" "$(esc "$dernier")" "$(esc "$agej")" "$(esc "$mode")" "$(esc "$wip")" "$(esc "$etape")"
    done <<< "$LIGNES"
    echo '</table>'
  } > "$HTML_OUT"
  echo "Tableau HTML écrit : $HTML_OUT"
  exit 0
fi

# ── Sortie Markdown ─────────────────────────────────────────────────────────
echo "| Projet | Dernier | Âge | Mode | WIP | Prochaine étape |"
echo "|---|---|---|---|---|---|"
while IFS='	' read -r age nom dernier agej mode wip etape; do
  echo "| $nom | $dernier | $agej | $mode | $wip | $etape |"
done <<< "$LIGNES"
