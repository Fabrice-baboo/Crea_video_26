# Prompt Claude Code — Pipeline vidéo custom (Option 3)

## Contexte

Je travaille sur un projet Next.js 14 (App Router, TypeScript, Tailwind) situé dans ce répertoire.
C'est un générateur de vidéos explicatives "whiteboard" en français, actuellement branché sur l'API Golpo AI.
Je veux construire un **moteur de génération 100% custom**, sans dépendance à Golpo, en utilisant :

- **Claude API (Anthropic)** pour générer le script et le storyboard
- **OpenAI TTS** (`tts-1` ou `tts-1-hd`) pour la voix off
- **DALL-E 3** (ou Replicate/SDXL si tu juges mieux) pour les illustrations par scène
- **ffmpeg** (via `fluent-ffmpeg` + `@ffmpeg/ffmpeg` WASM ou appel shell côté serveur) pour assembler audio + images en vidéo MP4

L'interface utilisateur (formulaire, poller, galerie) **existe déjà** — ne la touche pas. Tu dois uniquement implémenter la couche `lib/pipeline/` et adapter les routes API.

---

## Architecture cible

```
lib/
  pipeline/
    index.ts          ← orchestrateur principal (remplace lib/golpo.ts pour le moteur custom)
    script.ts         ← Claude API → script structuré + storyboard JSON
    tts.ts            ← OpenAI TTS → fichiers audio MP3 par scène
    illustrations.ts  ← DALL-E 3 → image PNG par scène
    assemblage.ts     ← ffmpeg → merge audio + image + transitions → MP4 final
    types.ts          ← types internes du pipeline
  golpo.ts            ← CONSERVER tel quel (fallback si GOLPO_API_KEY présent)
  types.ts            ← CONSERVER tel quel (types partagés UI)
```

---

## Étape 1 — Script & Storyboard (Claude API)

Fichier : `lib/pipeline/script.ts`

Appelle **Claude claude-sonnet-4-5** avec ce prompt système (adapte si besoin) :

```
Tu es un expert en création de vidéos explicatives.
À partir du sujet donné, génère un storyboard JSON structuré pour une vidéo de 60 à 120 secondes.
```

Le prompt utilisateur est le champ `params.prompt` (+ `params.script_personnalise` s'il est renseigné — dans ce cas, utilise-le comme script déjà validé et génère uniquement les descriptions visuelles).

La réponse doit être un JSON structuré avec ce format :

```typescript
interface Storyboard {
  titre: string;
  duree_estimee_secondes: number;
  scenes: Scene[];
}

interface Scene {
  numero: number;
  narration: string;          // texte à lire (TTS)
  description_visuelle: string; // prompt pour DALL-E (en anglais, style whiteboard)
  duree_secondes: number;     // durée de cette scène
}
```

Force la réponse JSON via `response_format` ou en demandant explicitement du JSON dans le prompt.
Nombre de scènes cible : entre 4 et 8 selon la complexité du sujet.

---

## Étape 2 — Voix off (OpenAI TTS)

Fichier : `lib/pipeline/tts.ts`

Pour chaque scène du storyboard :
- Appelle `POST https://api.openai.com/v1/audio/speech`
- Model : `tts-1` (ou `tts-1-hd` si `params.rythme === "normal"`)
- Voice mapping depuis `params.voix` :
  - `solo-female-3` → `nova`
  - `solo-female-4` → `shimmer`
  - `solo-male-3` → `onyx`
  - `solo-male-4` → `echo`
- Format : `mp3`
- Sauvegarde chaque fichier audio dans `/tmp/crea-video/{jobId}/audio/scene_{n}.mp3`
- Retourne la liste des chemins et la durée réelle de chaque fichier audio (via `ffprobe` ou `music-metadata`)

---

## Étape 3 — Illustrations (DALL-E 3)

Fichier : `lib/pipeline/illustrations.ts`

Pour chaque scène :
- Appelle `POST https://api.openai.com/v1/images/generations`
- Model : `dall-e-3`
- Prompt : `{scene.description_visuelle}` + suffix contextuel selon `params.style_canvas` :
  - `whiteboard` → `", clean whiteboard drawing style, black ink on white background, simple lines, educational illustration"`
  - `modern_minimal` → `", flat design, minimal, clean vector illustration, white background"`
  - `neon` → `", neon glow style, dark background, vibrant colors"`
  - (etc. — adapte pour les autres styles)
- Si `params.couleur === false` → ajoute `"black and white only"` au prompt
- Size : `1792x1024` (paysage) ou `1024x1792` (portrait) selon `params.orientation`
- Quality : `standard`
- Sauvegarde chaque image dans `/tmp/crea-video/{jobId}/images/scene_{n}.png`
- Retourne la liste des chemins

**Important** : Traite les scènes en parallèle (Promise.all) pour réduire le temps de génération.

---

## Étape 4 — Assemblage vidéo (ffmpeg)

Fichier : `lib/pipeline/assemblage.ts`

Utilise `fluent-ffmpeg` (npm package) côté serveur Node.js.

Pour chaque scène, génère un clip :
- Image fixe affichée pendant `scene.duree_secondes` secondes (utilise la durée audio réelle)
- Audio de la scène en overlay
- Résolution : `1920x1080` (paysage) ou `1080x1920` (portrait)

Enchaîne tous les clips avec un fondu entre les scènes (`xfade` filter, durée 0.3s).

Si `params.musique !== "none"` : ajoute une piste musicale de fond (volume 15%) — utilise des fichiers MP3 libres de droits embarqués dans `public/music/{genre}.mp3`, ou génère un silence si le fichier est absent.

Sortie finale : `/tmp/crea-video/{jobId}/output.mp4`

Après assemblage, upload le fichier MP4 vers Supabase Storage (bucket `videos`, path `{jobId}/output.mp4`) si `SUPABASE_URL` et `SUPABASE_SERVICE_KEY` sont définis dans l'env — sinon retourne l'URL locale.

---

## Étape 5 — Orchestrateur

Fichier : `lib/pipeline/index.ts`

```typescript
export async function genererVideoPipeline(
  jobId: string,
  params: ParamsGeneration,
  onProgression: (pct: number, message: string) => void
): Promise<string> // retourne l'URL de la vidéo finale
```

Séquence :
1. (0-10%) Génération storyboard via Claude
2. (10-40%) TTS toutes scènes en parallèle
3. (40-75%) Illustrations toutes scènes en parallèle
4. (75-95%) Assemblage ffmpeg
5. (95-100%) Upload + nettoyage /tmp

---

## Adaptation des routes API

### `app/api/generate/route.ts`

Modifie pour choisir le moteur selon l'env :
- Si `GOLPO_API_KEY` défini et `NEXT_PUBLIC_MOCK_MODE=false` → utilise `lib/golpo.ts`
- Sinon si `ANTHROPIC_API_KEY` et `OPENAI_API_KEY` définis → utilise `lib/pipeline/index.ts`
- Sinon → mode mock existant

Pour le pipeline custom, la génération est longue (30-90s) → lance-la **en arrière-plan** et retourne immédiatement un `job_id`. Stocke la progression en mémoire (Map<jobId, {progression, message, url_video?}>).

### `app/api/status/[jobId]/route.ts`

Modifie pour lire la progression depuis la Map du pipeline custom, en plus du mock existant.

---

## Variables d'environnement à ajouter dans `.env.example`

```env
# Pipeline custom
ANTHROPIC_API_KEY=         # Clé Anthropic Claude
OPENAI_API_KEY=            # Clé OpenAI (TTS + DALL-E 3)
SUPABASE_URL=              # Optionnel : stockage des vidéos finales
SUPABASE_SERVICE_KEY=      # Optionnel
```

---

## Packages npm à installer

```bash
npm install fluent-ffmpeg @anthropic-ai/sdk openai
npm install --save-dev @types/fluent-ffmpeg
```

Note : `ffmpeg` doit être installé sur la machine hôte (`brew install ffmpeg` sur macOS).

---

## Contraintes & conventions du projet

- Tous les identifiants, messages utilisateur et commentaires : **en français**
- Les prompts envoyés à DALL-E : **en anglais** (meilleure qualité)
- Conserver les types partagés dans `lib/types.ts` inchangés
- Ne pas toucher aux composants UI (`components/`) ni aux pages (`app/page.tsx`, `app/galerie/`)
- Le mode mock existant doit continuer à fonctionner si aucune clé API n'est configurée
- Utilise `async/await`, pas de callbacks, gestion d'erreurs exhaustive avec messages français
- Chaque fonction du pipeline doit logger sa progression sur `console.log` pour faciliter le debug

---

## Livrable attendu

1. Tous les fichiers `lib/pipeline/*.ts` créés et fonctionnels
2. `app/api/generate/route.ts` et `app/api/status/[jobId]/route.ts` adaptés
3. `.env.example` mis à jour
4. `package.json` mis à jour avec les nouvelles dépendances
5. Un test rapide : `curl -X POST http://localhost:3000/api/generate -H "Content-Type: application/json" -d '{"prompt":"Explique le cloud computing","moteur":"golpo_canvas","voix":"solo-female-3","langue_narration":"french","couleur":true,"musique":"lofi","orientation":"landscape","rythme":"normal","style_stylet":"stylus"}'` doit retourner un `job_id` valide et le polling doit progresser jusqu'à 100%.
