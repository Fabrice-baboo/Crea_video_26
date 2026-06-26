# CréaVidéo 🎬

Interface française pour générer des vidéos explicatives IA via [Golpo AI](https://video.golpoai.com).

## Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env.local
# Édite .env.local si tu as une clé API Golpo

# 3. Lancer en développement
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Mode mock vs API réelle

Par défaut, l'app tourne en **mode mock** — la génération est simulée localement (~15s) et retourne une vidéo de démonstration.

Pour utiliser l'API Golpo réelle :

1. Crée un compte sur [video.golpoai.com](https://video.golpoai.com) et obtiens une clé API
2. Dans `.env.local`, renseigne :
   ```
   GOLPO_API_KEY=ta_cle_ici
   NEXT_PUBLIC_MOCK_MODE=false
   ```
3. Redémarre le serveur

## Structure du projet

```
app/
  page.tsx          → Page d'accueil
  playground/       → Éditeur / générateur
  galerie/          → Galerie des vidéos
  api/
    generate/       → POST → Golpo API (ou mock)
    status/[jobId]/ → GET  → Polling du statut

components/
  NavBar.tsx        → Navigation
  VideoForm.tsx     → Formulaire de génération
  StatusPoller.tsx  → Suivi temps réel
  VideoCard.tsx     → Carte vidéo avec lecteur

lib/
  types.ts          → Types TypeScript partagés
  golpo.ts          → Client API Golpo + mock
```

## Fonctionnalités

- Génération par prompt ou script personnalisé
- 2 moteurs : Golpo Canvas (images) & Golpo Sketch (dessin)
- 10+ styles visuels
- 4 voix IA (féminine/masculine)
- Narration multi-langue (français, anglais, espagnol…)
- Musique d'ambiance (8 genres)
- Options avancées : orientation, rythme, style de stylet
- Suivi de la génération en temps réel (polling)
- Galerie avec lecteur vidéo intégré

## Prochaines étapes (roadmap perso)

- [ ] Persistance des vidéos via Supabase
- [ ] Upload de documents (PDF → vidéo)
- [ ] Prévisualisation du script avant génération
- [ ] Historique des générations (localStorage)
- [ ] Pipeline custom avec Claude API (sans dépendance Golpo)
