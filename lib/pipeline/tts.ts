// ─── Étape 2 — Voix off (ElevenLabs en direct) ───────────────────────────────
// Pour chaque scène : synthèse vocale MP3 via l'API ElevenLabs (multilingue v2),
// écriture locale + mesure de la durée réelle.
//
// On appelle ElevenLabs DIRECTEMENT (et non via Kie.ai) pour pouvoir utiliser
// des voix françaises natives de la Voice Library : le TTS de Kie n'accepte que
// les voix « par défaut » anglophones. Cf. mémoire projet kie-tts-french.
// Images (Flux-2) et musique (Suno) restent, elles, sur Kie.ai.

import { promises as fs } from "fs";
import path from "path";
import type { ParamsGeneration, VoixNarration } from "@/lib/types";
import type { Storyboard, AudioScene } from "./types";
import { dureeAudio } from "./util";

const BASE_ELEVENLABS = "https://api.elevenlabs.io";
const MODELE_TTS = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
const FORMAT_SORTIE = "mp3_44100_128";

// Voix françaises natives (Voice Library, ajoutées au compte ElevenLabs).
// Surcharger au besoin par variable d'environnement.
const VOIX_AUDREY = process.env.ELEVENLABS_VOIX_FEMALE || "McVZB9hVxVSk3Equu8EH";
const VOIX_NICOLAS = process.env.ELEVENLABS_VOIX_MALE_3 || "aQROLel5sQbj1vuIVi6B";
const VOIX_LEO = process.env.ELEVENLABS_VOIX_MALE_4 || "AfbuxQ9DVtS4azaxN1W7";

// Palier gratuit ElevenLabs = 1 seule voix féminine ajoutable : les deux choix
// « female » pointent donc vers Audrey. Les deux « male » sont distincts.
const MAP_VOIX: Record<VoixNarration, string> = {
  "solo-female-3": VOIX_AUDREY,
  "solo-female-4": process.env.ELEVENLABS_VOIX_FEMALE_4 || VOIX_AUDREY,
  "solo-male-3": VOIX_NICOLAS,
  "solo-male-4": VOIX_LEO,
};

function cleElevenLabs(): string {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error("Clé ELEVENLABS_API_KEY manquante pour la voix off.");
  return k;
}

/** Synthétise une scène en MP3 via ElevenLabs et l'écrit sur disque. */
async function synthetiserScene(
  texte: string,
  voix: string,
  vitesse: number,
  chemin: string,
  etape: string
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(
      `${BASE_ELEVENLABS}/v1/text-to-speech/${voix}?output_format=${FORMAT_SORTIE}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": cleElevenLabs(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: texte,
          model_id: MODELE_TTS,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            speed: vitesse,
          },
        }),
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`ElevenLabs injoignable (${etape}) : ${msg}`);
  }

  if (!res.ok) {
    const corps = await res.text().catch(() => "");
    throw new Error(
      `ElevenLabs a refusé la synthèse (${etape}, HTTP ${res.status}) : ${corps.slice(0, 200)}`
    );
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(chemin, buffer);
}

export async function genererVoixOff(
  storyboard: Storyboard,
  params: ParamsGeneration,
  dossierAudio: string
): Promise<AudioScene[]> {
  const voix = MAP_VOIX[params.voix] ?? VOIX_AUDREY;
  // Rythme "fast" → léger surdébit de parole (plage ElevenLabs : 0.7–1.2).
  const vitesse = params.rythme === "fast" ? 1.12 : 1.0;

  console.log(
    `[pipeline:tts] Synthèse vocale ElevenLabs de ${storyboard.scenes.length} scènes ` +
      `(voix=${voix}, modèle=${MODELE_TTS})…`
  );

  // Scènes en parallèle.
  const resultats = await Promise.all(
    storyboard.scenes.map(async (scene): Promise<AudioScene> => {
      const chemin = path.join(dossierAudio, `scene_${scene.numero}.mp3`);
      await synthetiserScene(
        scene.narration,
        voix,
        vitesse,
        chemin,
        `voix scène ${scene.numero}`
      );

      const dureeReelle = await dureeAudio(chemin, scene.duree_secondes);
      console.log(
        `[pipeline:tts] Scène ${scene.numero} → ${path.basename(chemin)} ` +
          `(${dureeReelle.toFixed(1)}s)`
      );
      return { numero: scene.numero, chemin, duree_reelle: dureeReelle };
    })
  );

  return resultats.sort((a, b) => a.numero - b.numero);
}
