// ─── Types internes du pipeline de génération custom ──────────────────────────
// Distincts des types partagés UI (lib/types.ts). Utilisés uniquement entre
// les étapes du pipeline (script → tts → illustrations → assemblage).

/** Une scène telle que produite par Claude (étape script). */
export interface Scene {
  numero: number;
  /** Texte lu par la voix off (TTS). En langue de narration. */
  narration: string;
  /** Prompt pour DALL-E, en anglais, style whiteboard. */
  description_visuelle: string;
  /** Durée estimée de la scène, en secondes. */
  duree_secondes: number;
}

/** Storyboard structuré renvoyé par Claude. */
export interface Storyboard {
  titre: string;
  duree_estimee_secondes: number;
  scenes: Scene[];
}

/** Résultat TTS pour une scène : chemin du MP3 + durée réelle mesurée. */
export interface AudioScene {
  numero: number;
  chemin: string;
  /** Durée réelle du fichier audio en secondes (ffprobe), sinon estimation. */
  duree_reelle: number;
}

/** Résultat illustration pour une scène : chemin du PNG. */
export interface ImageScene {
  numero: number;
  chemin: string;
}

/** Un clip prêt à assembler : image + audio + durée. */
export interface ClipScene {
  numero: number;
  chemin_image: string;
  chemin_audio: string;
  duree_secondes: number;
}
