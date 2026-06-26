# CréaVidéo 🎬

Interface française (Next.js 14) pour générer des vidéos explicatives IA de type « tableau blanc ».

La vidéo est construite de bout en bout par une **pipeline maison** : script (OpenRouter/Claude) → voix off (ElevenLabs) → illustrations (Kie/Flux-2) → musique (Kie/Suno) → assemblage (ffmpeg). Un **mode mock** local permet de tester l'interface sans aucune clé.

## Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env.local
# Renseigne tes clés (ou laisse vide pour le mode mock)

# 3. Installer ffmpeg (requis par la pipeline)
brew install ffmpeg        # macOS

# 4. Lancer en développement
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Mode mock vs pipeline réelle

- **Mock** (défaut sans clés, ou `NEXT_PUBLIC_MOCK_MODE=true`) — génération simulée localement (~15s), vidéo de démonstration.
- **Pipeline custom** — activée dès que `OPENROUTER_API_KEY` **et** `KIE_API_KEY` sont définis. La voix off requiert en plus `ELEVENLABS_API_KEY` (**plan payant** pour les voix françaises natives). Génération réelle en 30–90s.

Voir `.env.example` pour la liste complète des variables.

## Structure du projet

```
app/
  page.tsx          → Page d'accueil
  playground/       → Éditeur / générateur
  galerie/          → Galerie des vidéos
  api/
    generate/             → POST → pipeline custom (ou mock)
    status/[jobId]/       → GET  → polling du statut
    video/[jobId]/        → GET  → streaming du MP4 local
    extraire-document/    → POST → extraction texte d'un PDF/Word

components/
  NavBar.tsx        → Navigation
  VideoForm.tsx     → Formulaire de génération
  StatusPoller.tsx  → Suivi temps réel
  VideoCard.tsx     → Carte vidéo avec lecteur

lib/
  types.ts          → Types TypeScript partagés
  mock.ts           → Moteur mock (simulation locale)
  extraction.ts     → Extraction texte PDF/Word (pdf-parse, mammoth, word-extractor)
  pipeline/         → Pipeline custom (script, tts, illustrations, suno, assemblage…)
```

## Fonctionnalités

- Génération par prompt ou script personnalisé
- **Import d'un document de référence** (PDF, .docx, .doc, .txt) que le script suit fidèlement
- 2 types de rendu : Illustrations (canvas) & Croquis (sketch)
- 10+ styles visuels
- 4 voix IA (féminine/masculine)
- Narration multi-langue (français, anglais, espagnol…)
- Musique d'ambiance (8 genres)
- Options avancées : orientation, rythme, style de stylet
- Suivi de la génération en temps réel (polling)
- Galerie avec lecteur vidéo intégré

## Prochaines étapes (roadmap perso)

- [ ] Persistance des vidéos via Supabase
- [ ] Prévisualisation du script avant génération
- [ ] Historique des générations (localStorage)
