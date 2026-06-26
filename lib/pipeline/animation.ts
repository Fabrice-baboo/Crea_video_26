// ─── Étape 3 bis — Animation des scènes (Kie.ai → Grok Imagine) ───────────────
// Transforme chaque image fixe Flux-2 en court clip vidéo (image→vidéo), pour
// donner du mouvement tout en préservant le style dessiné-main.
//
// On part de l'URL Kie de l'image (sortie de l'étape illustrations) et on la
// passe à grok-imagine/image-to-video. La durée du clip est calée sur la durée
// réelle de la narration de la scène (bornée 6–30 s, contrainte du modèle).
//
// Non bloquant par scène : si l'animation échoue, on renvoie null pour la scène
// et l'assemblage retombe sur l'image fixe correspondante.

import path from "path";
import type { ParamsGeneration } from "@/lib/types";
import type { AnimScene, AudioScene, ImageScene, Storyboard } from "./types";
import { genererViaKie, telechargerFichier } from "./kie";

const MODELE_VIDEO =
  process.env.KIE_VIDEO_MODEL || "grok-imagine/image-to-video";
const RESOLUTION_VIDEO = process.env.KIE_VIDEO_RESOLUTION || "720p";

// Clips simultanés (la génération vidéo est lente ~1-2 min ; on plafonne pour
// rester sous les limites de débit du modèle).
const CONCURRENCE = Math.max(1, Number(process.env.ANIMATION_CONCURRENCE) || 3);

// Bornes de durée du modèle Grok Imagine (secondes).
const DUREE_MIN = 6;
const DUREE_MAX = 30;

/** Ratio d'image selon l'orientation. */
function aspectRatio(params: ParamsGeneration): "16:9" | "9:16" {
  return params.orientation === "portrait" ? "9:16" : "16:9";
}

/** Durée de clip à demander : narration arrondie au supérieur, bornée 6–30 s. */
function dureeClip(dureeAudio: number): number {
  return Math.min(DUREE_MAX, Math.max(DUREE_MIN, Math.ceil(dureeAudio)));
}

/** Exécute `fn` sur chaque élément avec au plus `limite` tâches simultanées. */
async function mapLimite<T, R>(
  items: T[],
  limite: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const resultats = new Array<R>(items.length);
  let curseur = 0;
  async function worker(): Promise<void> {
    while (curseur < items.length) {
      const i = curseur++;
      resultats[i] = await fn(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limite, items.length) }, () => worker())
  );
  return resultats;
}

export async function genererAnimations(
  storyboard: Storyboard,
  images: ImageScene[],
  audios: AudioScene[],
  params: ParamsGeneration,
  dossierVideos: string
): Promise<(AnimScene | null)[]> {
  const ratio = aspectRatio(params);

  console.log(
    `[pipeline:animation] Animation de ${storyboard.scenes.length} scènes ` +
      `via Kie.ai (${MODELE_VIDEO}, ${RESOLUTION_VIDEO}, concurrence=${CONCURRENCE})…`
  );

  return mapLimite(
    storyboard.scenes,
    CONCURRENCE,
    async (scene): Promise<AnimScene | null> => {
      const image = images.find((i) => i.numero === scene.numero);
      const audio = audios.find((a) => a.numero === scene.numero);
      if (!image || !audio) return null;

      const duree = dureeClip(audio.duree_reelle);
      const chemin = path.join(dossierVideos, `scene_${scene.numero}.mp4`);
      // Prompt de mouvement sobre : on anime sans dénaturer le dessin.
      const prompt =
        `${scene.description_visuelle}. Subtle gentle motion, the hand-drawn ` +
        `illustration comes to life, keep the original line-art sketch style, no new objects, no text`;

      try {
        const urls = await genererViaKie(
          MODELE_VIDEO,
          {
            image_urls: [image.url],
            prompt,
            duration: String(duree),
            resolution: RESOLUTION_VIDEO,
            aspect_ratio: ratio,
          },
          `animation scène ${scene.numero}`,
          { intervalleMs: 4000, maxTentatives: 120 } // ~8 min de marge
        );
        await telechargerFichier(urls[0], chemin);
        console.log(
          `[pipeline:animation] Scène ${scene.numero} → ${path.basename(chemin)} (${duree}s)`
        );
        return { numero: scene.numero, chemin_video: chemin, secondes_facturees: duree };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // Non bloquant : on retombera sur l'image fixe pour cette scène.
        console.warn(
          `[pipeline:animation] Scène ${scene.numero} non animée (${msg}) — image fixe conservée.`
        );
        return null;
      }
    }
  );
}
