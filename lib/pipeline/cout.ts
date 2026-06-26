// ─── Estimation du coût d'une vidéo ───────────────────────────────────────────
// Calcule un coût ESTIMÉ en euros à partir des quantités réellement consommées
// par chaque fournisseur (tokens OpenRouter, caractères ElevenLabs, nombre
// d'images Flux-2, pistes Suno) × des tarifs unitaires configurables.
//
// Les tarifs sont des estimations indicatives (les fournisseurs facturent en
// USD, souvent via crédits/abonnement) : surcharge-les par variables
// d'environnement pour coller à ta facturation réelle.

import type { CoutVideo, PosteCout } from "@/lib/types";

/** Lit un nombre depuis l'environnement, avec valeur par défaut. */
function envNombre(cle: string, defaut: number): number {
  const v = process.env[cle];
  if (v === undefined || v === "") return defaut;
  const n = Number(v);
  return Number.isFinite(n) ? n : defaut;
}

// Taux de conversion : euros pour 1 USD (les tarifs ci-dessous sont en USD).
const TAUX_USD_EUR = envNombre("COUT_TAUX_USD_EUR", 0.92);

// OpenRouter (script) — tarifs du modèle, en USD par MILLION de tokens.
const OPENROUTER_INPUT_USD_M = envNombre("COUT_OPENROUTER_INPUT_USD_M", 3);
const OPENROUTER_OUTPUT_USD_M = envNombre("COUT_OPENROUTER_OUTPUT_USD_M", 15);

// ElevenLabs (voix off) — USD pour 1000 caractères synthétisés.
const ELEVENLABS_USD_1K = envNombre("COUT_ELEVENLABS_USD_1K_CHARS", 0.15);

// Kie.ai — USD par image Flux-2 et par piste de musique Suno.
const IMAGE_USD = envNombre("COUT_IMAGE_USD", 0.04);
const MUSIQUE_USD = envNombre("COUT_MUSIQUE_USD", 0.08);

export interface QuantitesCout {
  /** Tokens d'entrée OpenRouter (prompt). */
  tokensEntree: number;
  /** Tokens de sortie OpenRouter (réponse). */
  tokensSortie: number;
  /** Nombre total de caractères synthétisés par ElevenLabs. */
  caracteresVoix: number;
  /** Nombre d'images Flux-2 générées. */
  nbImages: number;
  /** Nombre de pistes de musique Suno générées (0 ou 1). */
  nbMusiques: number;
}

const eur = (usd: number) => usd * TAUX_USD_EUR;

/** Calcule le coût estimé en euros à partir des quantités consommées. */
export function calculerCout(q: QuantitesCout): CoutVideo {
  const scriptUsd =
    (q.tokensEntree / 1_000_000) * OPENROUTER_INPUT_USD_M +
    (q.tokensSortie / 1_000_000) * OPENROUTER_OUTPUT_USD_M;
  const voixUsd = (q.caracteresVoix / 1000) * ELEVENLABS_USD_1K;
  const imagesUsd = q.nbImages * IMAGE_USD;
  const musiqueUsd = q.nbMusiques * MUSIQUE_USD;

  const postes: PosteCout[] = [
    { libelle: "Script (OpenRouter)", montant_eur: eur(scriptUsd) },
    { libelle: "Voix off (ElevenLabs)", montant_eur: eur(voixUsd) },
    {
      libelle: "Images (Flux-2)",
      detail: `×${q.nbImages}`,
      montant_eur: eur(imagesUsd),
    },
  ];
  if (q.nbMusiques > 0) {
    postes.push({ libelle: "Musique (Suno)", montant_eur: eur(musiqueUsd) });
  }

  const total_eur = postes.reduce((acc, p) => acc + p.montant_eur, 0);
  return { total_eur, postes };
}
