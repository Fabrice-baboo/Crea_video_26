#!/usr/bin/env bash
# etat-projet.sh — Snapshot LECTURE SEULE de l'état réel d'un projet.
# Usage : bash etat-projet.sh <chemin_du_projet>
# Ne modifie rien. Sert d'ÉTAPE 0 du skill "chantier" : ancrer avant de parler.

set -uo pipefail

PROJ="${1:-.}"
JOURS="${CHANTIER_JOURS:-14}"

if [ ! -d "$PROJ" ]; then
  echo "ERREUR : dossier introuvable : $PROJ" >&2
  exit 1
fi

cd "$PROJ" || exit 1
PROJ_ABS="$(pwd)"
NOM="$(basename "$PROJ_ABS")"

echo "═══════════════════════════════════════════════════════════"
echo " SNAPSHOT — $NOM"
echo " $PROJ_ABS"
echo "═══════════════════════════════════════════════════════════"

# ── Mode : présence de CLAUDE.md ────────────────────────────────────────────
if [ -f "CLAUDE.md" ]; then
  MODE="REPRISE"
else
  MODE="AMORCE"
fi
echo ""
echo "MODE : $MODE   (CLAUDE.md $( [ "$MODE" = REPRISE ] && echo présent || echo absent ))"

# ── Git ─────────────────────────────────────────────────────────────────────
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo ""
  echo "── Git ─────────────────────────────────────────────────"
  BRANCHE="$(git branch --show-current 2>/dev/null || echo '(détachée)')"
  echo "Branche : $BRANCHE"

  echo ""
  echo "Derniers commits :"
  git log --oneline -n 10 --date=short --pretty=format:'  %ad  %h  %s' 2>/dev/null || echo "  (aucun commit)"
  echo ""

  echo ""
  DERNIER="$(git log -1 --format='%cr (%cd)' --date=short 2>/dev/null || echo '?')"
  echo "Dernier commit : $DERNIER"

  echo ""
  echo "Modifs non committées (WIP) :"
  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    git status --short 2>/dev/null | sed 's/^/  /'
  else
    echo "  (arbre propre)"
  fi

  echo ""
  echo "Fichiers touchés (commits) sur $JOURS j :"
  git log --since="$JOURS days ago" --name-only --pretty=format: 2>/dev/null \
    | grep -v '^$' | sort -u | head -40 | sed 's/^/  /' || true
  CHANGED="$(git log --since="$JOURS days ago" --name-only --pretty=format: 2>/dev/null | grep -cv '^$')"
  [ "${CHANGED:-0}" -eq 0 ] && echo "  (aucun)"
else
  echo ""
  echo "── Git ─────────────────────────────────────────────────"
  echo "Pas de dépôt git ici. Fichiers modifiés récemment ($JOURS j) :"
  find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' \
    -not -path '*/.next/*' -not -path '*/dist/*' -not -path '*/build/*' \
    -mtime -"$JOURS" 2>/dev/null | head -40 | sed 's/^/  /'
fi

# ── Stack détectée ──────────────────────────────────────────────────────────
echo ""
echo "── Stack détectée ──────────────────────────────────────"
detect() { [ -e "$1" ] && echo "  • $2"; }
detect package.json        "Node / JS — package.json"
detect tsconfig.json       "TypeScript"
detect next.config.js      "Next.js"; detect next.config.mjs "Next.js"; detect next.config.ts "Next.js"
detect requirements.txt    "Python — requirements.txt"
detect pyproject.toml      "Python — pyproject.toml"
detect Cargo.toml          "Rust — Cargo"
detect go.mod              "Go — go.mod"
detect composer.json       "PHP — Composer"
detect Gemfile             "Ruby — Bundler"
detect pom.xml             "Java — Maven"; detect build.gradle "Java/Kotlin — Gradle"
detect Dockerfile          "Docker"
detect docker-compose.yml  "Docker Compose"; detect compose.yaml "Docker Compose"
detect .env                ".env présent (NE PAS recopier de secrets)"
detect supabase            "Supabase (dossier)"

echo ""
echo "── ROUTE → $MODE ───────────────────────────────────────"
if [ "$MODE" = "REPRISE" ]; then
  echo "  Lire CLAUDE.md, comparer au snapshot ci-dessus, signaler les écarts,"
  echo "  puis mettre à jour (voir references/reprise-etat-reel.md)."
else
  echo "  Cadrer le projet puis créer CLAUDE.md (voir references/modele-CLAUDE.md)."
fi
echo "═══════════════════════════════════════════════════════════"
