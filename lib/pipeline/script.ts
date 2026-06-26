// ─── Étape 1 — Script & Storyboard (OpenRouter → Claude) ──────────────────────
// Sujet utilisateur → storyboard JSON structuré (titre, scènes, narration,
// descriptions visuelles en anglais pour la génération d'images).
//
// Passe par OpenRouter (passerelle compatible OpenAI). Doc : openrouter.ai/docs

import OpenAI from "openai";
import type { ParamsGeneration } from "@/lib/types";
import type { Storyboard } from "./types";

/** Storyboard + usage de tokens (pour l'estimation du coût). */
export interface ResultatScript {
  storyboard: Storyboard;
  tokens_entree: number;
  tokens_sortie: number;
}

const BASE_URL = process.env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1";
const MODELE = process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.6";

const PROMPT_SYSTEME = `Tu es un expert en création de vidéos explicatives.

À partir du sujet donné, génère un storyboard structuré pour une vidéo de 60 à 120 secondes.

Contraintes :
- Entre 4 et 8 scènes selon la complexité du sujet.
- "narration" est le texte à lire par la voix off : phrases courtes, claires, dans la langue demandée.
- "description_visuelle" est un prompt de génération d'image : il DOIT être rédigé en anglais, décrivant une illustration simple de type tableau blanc (whiteboard), un seul concept visuel par scène. NE DEMANDE AUCUN TEXTE dans l'image : pas de mots, d'étiquettes, de légendes ni de chiffres écrits (les modèles d'image rendent mal le texte et c'est la voix off qui porte les mots). Décris uniquement des éléments visuels (objets, pictogrammes, schémas sans libellés).
- "duree_secondes" estime la durée de lecture de la narration (réaliste : ~2,5 mots/seconde).
- "duree_estimee_secondes" est la somme des durées des scènes.

Réponds UNIQUEMENT avec un objet JSON valide conforme au schéma, sans texte ni balises markdown.`;

// Schéma JSON strict imposé à OpenRouter (supporté par Claude Sonnet 4.5+).
const SCHEMA_STORYBOARD = {
  type: "object",
  properties: {
    titre: { type: "string" },
    duree_estimee_secondes: { type: "number" },
    scenes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          numero: { type: "number" },
          narration: { type: "string" },
          description_visuelle: { type: "string" },
          duree_secondes: { type: "number" },
        },
        required: ["numero", "narration", "description_visuelle", "duree_secondes"],
        additionalProperties: false,
      },
    },
  },
  required: ["titre", "duree_estimee_secondes", "scenes"],
  additionalProperties: false,
} as const;

export async function genererStoryboard(
  params: ParamsGeneration
): Promise<ResultatScript> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Clé OPENROUTER_API_KEY manquante pour générer le script.");
  }

  console.log(`[pipeline:script] Génération du storyboard via OpenRouter (${MODELE})…`);
  const client = new OpenAI({
    baseURL: BASE_URL,
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://crea-video.local",
      "X-Title": "CréaVidéo",
    },
  });

  // Si un script personnalisé est fourni, on le traite comme déjà validé :
  // le modèle se contente de le découper et d'ajouter les descriptions visuelles.
  const promptUtilisateur = params.script_personnalise
    ? `Sujet : ${params.prompt}\n\nLangue de narration : ${params.langue_narration}\n\nScript déjà validé à découper en scènes (ne réécris PAS la narration, réutilise ce texte tel quel, découpe-le simplement et ajoute pour chaque scène une "description_visuelle" en anglais) :\n\n${params.script_personnalise}`
    : `Sujet : ${params.prompt}\n\nLangue de narration : ${params.langue_narration}`;

  // Document de référence importé : matériau source que la vidéo doit suivre
  // fidèlement (faits, structure, terminologie). On l'ajoute en contexte, sans
  // le recopier mot pour mot dans la narration.
  const reference = params.reference_document?.trim();
  const contenuUtilisateur = reference
    ? `${promptUtilisateur}\n\nDocument de référence à suivre fidèlement (appuie-toi sur son contenu, ses faits et sa terminologie ; ne recopie pas le texte tel quel, reformule-le en narration claire) :\n"""\n${reference}\n"""`
    : promptUtilisateur;

  let texte: string;
  let tokensEntree = 0;
  let tokensSortie = 0;
  try {
    const completion = await client.chat.completions.create({
      model: MODELE,
      max_tokens: 4096,
      messages: [
        { role: "system", content: PROMPT_SYSTEME },
        { role: "user", content: contenuUtilisateur },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "storyboard", strict: true, schema: SCHEMA_STORYBOARD },
      },
    });
    texte = completion.choices[0]?.message?.content ?? "";
    tokensEntree = completion.usage?.prompt_tokens ?? 0;
    tokensSortie = completion.usage?.completion_tokens ?? 0;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Échec de l'appel OpenRouter (script) : ${msg}`);
  }

  const storyboard = parserStoryboard(texte);
  console.log(
    `[pipeline:script] Storyboard « ${storyboard.titre} » — ${storyboard.scenes.length} scènes, ~${storyboard.duree_estimee_secondes}s ` +
      `(${tokensEntree}+${tokensSortie} tokens)`
  );
  return { storyboard, tokens_entree: tokensEntree, tokens_sortie: tokensSortie };
}

/** Parse + valide le JSON renvoyé par le modèle, avec messages d'erreur français. */
function parserStoryboard(jsonBrut: string): Storyboard {
  const debut = jsonBrut.indexOf("{");
  const fin = jsonBrut.lastIndexOf("}");
  if (debut === -1 || fin === -1 || fin <= debut) {
    throw new Error("Réponse invalide : aucun JSON détecté dans le script.");
  }

  let data: unknown;
  try {
    data = JSON.parse(jsonBrut.slice(debut, fin + 1));
  } catch {
    throw new Error("Réponse invalide : JSON du storyboard non parsable.");
  }

  const obj = data as Partial<Storyboard>;
  if (!obj || !Array.isArray(obj.scenes) || obj.scenes.length === 0) {
    throw new Error("Storyboard invalide : aucune scène générée.");
  }

  const scenes = obj.scenes.map((s, i) => {
    const narration = String(s?.narration ?? "").trim();
    const description = String(s?.description_visuelle ?? "").trim();
    if (!narration || !description) {
      throw new Error(`Scène ${i + 1} incomplète (narration ou visuel manquant).`);
    }
    const duree = Number(s?.duree_secondes);
    return {
      numero: Number(s?.numero) || i + 1,
      narration,
      description_visuelle: description,
      duree_secondes: Number.isFinite(duree) && duree > 0 ? duree : 12,
    };
  });

  const dureeEstimee =
    Number(obj.duree_estimee_secondes) ||
    scenes.reduce((acc, s) => acc + s.duree_secondes, 0);

  return {
    titre: String(obj.titre ?? "Vidéo explicative").trim(),
    duree_estimee_secondes: dureeEstimee,
    scenes,
  };
}
