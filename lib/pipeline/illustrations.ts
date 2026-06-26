// ─── Étape 3 — Illustrations (Kie.ai → Flux-2 Pro) ────────────────────────────
// Une image PNG par scène, prompt en anglais + suffixe de style.

import path from "path";
import type { ParamsGeneration, StyleCanvas, StyleSketch } from "@/lib/types";
import type { Storyboard, ImageScene } from "./types";
import { genererViaKie, telechargerFichier } from "./kie";

const MODELE_IMAGE =
  process.env.KIE_IMAGE_MODEL || "flux-2/pro-text-to-image";

// Consigne anti-texte : les modèles d'image impriment des libellés (souvent en
// anglais et bafouillés) qui jurent avec une narration française. On bannit donc
// tout texte des illustrations : la voix off porte les mots.
const SUFFIXE_SANS_TEXTE =
  ", no text, no words, no letters, no labels, no captions, purely visual icons and illustrations";

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
    ", technical schematic diagram, precise line art, blueprint style",
  editorial:
    ", editorial illustration, sophisticated, muted palette, magazine style",
  marker:
    ", bold marker drawing style, hand-drawn sketchnote strokes, white background",
  illustrations:
    ", detailed polished digital illustration, clean composition",
};

// Suffixe pour les styles sketch (rendu « sketch »). Pas de mention « noir et
// blanc » ici : la coloration est pilotée par le suffixe couleur (params.couleur).
const SUFFIXE_SKETCH: Record<StyleSketch, string> = {
  classic: ", hand-drawn sketch style, clean line art, white background",
  improved: ", refined ink sketch style, clean line art, white background",
  advanced: ", detailed ink illustration, fine hatching, white background",
  creative: ", creative expressive sketch, dynamic hand-drawn lines, white background",
  infographics: ", infographic sketch style, icons and simple diagrams, white background",
  chalkboard_black_on_white:
    ", black chalk drawing on white background, hand-drawn chalkboard style",
};

function suffixeDeStyle(params: ParamsGeneration): string {
  if (params.style_rendu === "sketch") {
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
  // Couleur ACTIVE : si demandée, on réclame explicitement des couleurs (sinon
  // les styles « croquis/encre » rendent presque toujours en noir et blanc).
  const suffixeCouleur = params.couleur
    ? ", colored illustration, soft natural colors, gentle watercolor and colored-pencil fills over the line art, hand-coloured look"
    : ", black and white, monochrome line art, no color";
  const ratio = aspectRatio(params);

  console.log(
    `[pipeline:illustrations] Génération de ${storyboard.scenes.length} images ` +
      `via Kie.ai (${MODELE_IMAGE}, ${ratio})…`
  );

  // Scènes en parallèle pour réduire le temps total.
  const resultats = await Promise.all(
    storyboard.scenes.map(async (scene): Promise<ImageScene> => {
      const prompt = `${scene.description_visuelle}${suffixe}${suffixeCouleur}${SUFFIXE_SANS_TEXTE}`;
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
      // On conserve l'URL Kie : elle sert d'entrée au modèle image→vidéo.
      return { numero: scene.numero, chemin, url: urls[0] };
    })
  );

  return resultats.sort((a, b) => a.numero - b.numero);
}
