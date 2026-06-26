// ─── Étape 3 — Illustrations (Kie.ai → Flux-2 Pro) ────────────────────────────
// Une image PNG par scène, prompt en anglais + suffixe de style.

import path from "path";
import type { ParamsGeneration, StyleCanvas, StyleSketch } from "@/lib/types";
import type { Storyboard, ImageScene } from "./types";
import { genererViaKie, telechargerFichier } from "./kie";

const MODELE_IMAGE =
  process.env.KIE_IMAGE_MODEL || "flux-2/pro-text-to-image";

// Suffixe de style appliqué au prompt (en anglais), par style canvas.
const SUFFIXE_STYLE: Record<StyleCanvas, string> = {
  whiteboard:
    ", clean whiteboard drawing style, black ink on white background, simple lines, educational illustration",
  modern_minimal:
    ", flat design, minimal, clean vector illustration, white background",
  neon: ", neon glow style, dark background, vibrant colors, glowing outlines",
  chalkboard:
    ", chalkboard style, white chalk drawing on dark green blackboard, hand-drawn",
  chalkboard_black_on_white:
    ", black chalk drawing on white background, hand-drawn chalkboard style",
  playful:
    ", playful cartoon illustration, bright cheerful colors, rounded shapes",
  technical:
    ", technical schematic diagram, precise line art, blueprint style, labeled",
  editorial:
    ", editorial illustration, sophisticated, muted palette, magazine style",
  marker:
    ", bold marker drawing style, hand-drawn sketchnote strokes, white background",
  illustrations:
    ", detailed polished digital illustration, clean composition",
};

// Suffixe pour les styles sketch (moteur golpo_sketch).
const SUFFIXE_SKETCH: Record<StyleSketch, string> = {
  classic: ", hand-drawn pencil sketch style, black and white line art, white background",
  improved: ", refined ink sketch style, clean line art, white background",
  advanced: ", detailed ink illustration, fine hatching, white background",
  creative: ", creative expressive sketch, dynamic hand-drawn lines, white background",
  infographics: ", infographic sketch style, icons and simple diagrams, white background",
  chalkboard_black_on_white:
    ", black chalk drawing on white background, hand-drawn chalkboard style",
};

function suffixeDeStyle(params: ParamsGeneration): string {
  if (params.moteur === "golpo_sketch") {
    const s = params.style_sketch;
    if (s && SUFFIXE_SKETCH[s]) return SUFFIXE_SKETCH[s];
    return SUFFIXE_SKETCH.classic;
  }
  const s = params.style_canvas;
  if (s && SUFFIXE_STYLE[s]) return SUFFIXE_STYLE[s];
  return SUFFIXE_STYLE.whiteboard;
}

/** Ratio d'image selon l'orientation. */
function aspectRatio(params: ParamsGeneration): "16:9" | "9:16" {
  return params.orientation === "portrait" ? "9:16" : "16:9";
}

export async function genererIllustrations(
  storyboard: Storyboard,
  params: ParamsGeneration,
  dossierImages: string
): Promise<ImageScene[]> {
  const suffixe = suffixeDeStyle(params);
  const suffixeCouleur = params.couleur ? "" : ", black and white only, monochrome";
  const ratio = aspectRatio(params);

  console.log(
    `[pipeline:illustrations] Génération de ${storyboard.scenes.length} images ` +
      `via Kie.ai (${MODELE_IMAGE}, ${ratio})…`
  );

  // Scènes en parallèle pour réduire le temps total.
  const resultats = await Promise.all(
    storyboard.scenes.map(async (scene): Promise<ImageScene> => {
      const prompt = `${scene.description_visuelle}${suffixe}${suffixeCouleur}`;
      const chemin = path.join(dossierImages, `scene_${scene.numero}.png`);
      const urls = await genererViaKie(
        MODELE_IMAGE,
        { prompt, aspect_ratio: ratio, resolution: "1K" },
        `image scène ${scene.numero}`
      );
      await telechargerFichier(urls[0], chemin);

      console.log(
        `[pipeline:illustrations] Scène ${scene.numero} → ${path.basename(chemin)}`
      );
      return { numero: scene.numero, chemin };
    })
  );

  return resultats.sort((a, b) => a.numero - b.numero);
}
