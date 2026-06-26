// ─── Types partagés ───────────────────────────────────────────────────────────

// Type de rendu visuel : illustrations stylisées ("canvas") ou croquis au
// trait ("sketch"). Détermine quel jeu de styles s'applique (style_canvas vs
// style_sketch) et les suffixes de prompt d'image de la pipeline.
export type StyleRendu = "canvas" | "sketch";

export type StyleCanvas =
  | "whiteboard"
  | "neon"
  | "chalkboard"
  | "modern_minimal"
  | "playful"
  | "technical"
  | "editorial"
  | "marker"
  | "illustrations"
  | "chalkboard_black_on_white";

export type StyleSketch =
  | "classic"
  | "improved"
  | "advanced"
  | "creative"
  | "infographics"
  | "chalkboard_black_on_white";

export type VoixNarration =
  | "solo-female-3"
  | "solo-female-4"
  | "solo-male-3"
  | "solo-male-4";

export type MusiqueAmbiante =
  | "none"
  | "jazz"
  | "lofi"
  | "dramatic"
  | "engaging"
  | "hyper"
  | "inspirational"
  | "documentary";

export type Orientation = "landscape" | "portrait";
export type Rythme = "normal" | "fast";
export type StyleStylet = "stylus" | "marker" | "pen";
/** Fourchette de durée cible de la vidéo, en minutes. */
export type DureeVideo = "1-2" | "2-3" | "4-8" | "8-12" | "12-20";

export interface ParamsGeneration {
  prompt: string;
  script_personnalise?: string;
  /** Texte extrait d'un document de référence (PDF/Word) à suivre fidèlement. */
  reference_document?: string;
  /** Nom du fichier de référence importé (affichage uniquement). */
  reference_nom?: string;
  style_rendu: StyleRendu;
  style_canvas?: StyleCanvas;
  style_sketch?: StyleSketch;
  voix: VoixNarration;
  langue_narration: string;
  couleur: boolean;
  musique: MusiqueAmbiante;
  orientation: Orientation;
  rythme: Rythme;
  style_stylet: StyleStylet;
  /** Fourchette de durée cible (minutes). Défaut : "1-2". */
  duree?: DureeVideo;
}

export type StatutJob =
  | "en_attente"
  | "en_cours"
  | "termine"
  | "erreur";

/** Un poste de coût (un fournisseur / une étape de la pipeline). */
export interface PosteCout {
  /** Libellé affiché, ex. "Script (OpenRouter)". */
  libelle: string;
  /** Détail facultatif de la quantité, ex. "×6" pour 6 images. */
  detail?: string;
  /** Coût estimé du poste, en euros. */
  montant_eur: number;
}

/** Coût estimé d'une vidéo générée (estimation, hors taxes/abonnements). */
export interface CoutVideo {
  total_eur: number;
  postes: PosteCout[];
}

export interface Video {
  id: string;
  titre: string;
  prompt: string;
  statut: StatutJob;
  url_video?: string;
  url_miniature?: string;
  duree_secondes?: number;
  cree_le: string;
  parametres: ParamsGeneration;
  /** Coût estimé de la génération (pipeline custom uniquement). */
  cout?: CoutVideo;
}

export interface ReponseGeneration {
  job_id: string;
  video_id: string;
  message: string;
}

export interface ReponseStatut {
  job_id: string;
  video_id: string;
  statut: StatutJob;
  progression: number; // 0-100
  video?: Video;
  message?: string;
}
