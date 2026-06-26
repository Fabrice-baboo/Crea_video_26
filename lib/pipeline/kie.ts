// ─── Client Kie.ai ────────────────────────────────────────────────────────────
// API asynchrone unifiée : createTask → polling recordInfo → resultUrls.
// Utilisée pour les illustrations (Flux-2) et la voix off (ElevenLabs).
//
// Doc : https://docs.kie.ai/common-api/quickstart

import { promises as fs } from "fs";

const BASE = process.env.KIE_API_URL || "https://api.kie.ai";

function cleKie(): string {
  const k = process.env.KIE_API_KEY;
  if (!k) throw new Error("Clé KIE_API_KEY manquante pour les appels Kie.ai.");
  return k;
}

interface ReponseRecordInfo {
  code: number;
  msg?: string;
  data?: {
    state?: "waiting" | "queuing" | "generating" | "success" | "fail";
    resultJson?: string;
    failMsg?: string;
  };
}

/** Crée une tâche Kie.ai et retourne son taskId. */
async function creerTache(
  model: string,
  input: Record<string, unknown>,
  etape: string
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/v1/jobs/createTask`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleKie()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input }),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Kie.ai injoignable (${etape}) : ${msg}`);
  }

  const data = (await res.json().catch(() => ({}))) as {
    code?: number;
    msg?: string;
    data?: { taskId?: string };
  };
  if (!res.ok || data.code !== 200 || !data.data?.taskId) {
    throw new Error(
      `Kie.ai a refusé la tâche (${etape}) : ${data.msg || res.status}`
    );
  }
  return data.data.taskId;
}

/** Attend la fin d'une tâche Kie.ai et retourne les URLs de résultat. */
async function attendreTache(
  taskId: string,
  etape: string,
  options: { intervalleMs?: number; maxTentatives?: number } = {}
): Promise<string[]> {
  const intervalle = options.intervalleMs ?? 3000;
  const maxTentatives = options.maxTentatives ?? 100; // ~5 min à 3 s

  for (let tentative = 0; tentative < maxTentatives; tentative++) {
    await new Promise((r) => setTimeout(r, intervalle));

    let res: Response;
    try {
      res = await fetch(`${BASE}/api/v1/jobs/recordInfo?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${cleKie()}` },
      });
    } catch {
      continue; // erreur réseau transitoire : on retente
    }

    const corps = (await res.json().catch(() => ({}))) as ReponseRecordInfo;
    const etat = corps.data?.state;

    if (etat === "success") {
      try {
        const resultat = JSON.parse(corps.data?.resultJson || "{}") as {
          resultUrls?: string[];
        };
        const urls = resultat.resultUrls ?? [];
        if (urls.length === 0) {
          throw new Error("tâche réussie mais aucune URL de résultat");
        }
        return urls;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Résultat Kie.ai illisible (${etape}) : ${msg}`);
      }
    }

    if (etat === "fail") {
      throw new Error(
        `Tâche Kie.ai en échec (${etape}) : ${corps.data?.failMsg || "raison inconnue"}`
      );
    }
    // waiting / queuing / generating → on continue à patienter.
  }

  throw new Error(`Délai dépassé pour la tâche Kie.ai (${etape}).`);
}

/** Crée une tâche puis attend son résultat (helper combiné). */
export async function genererViaKie(
  model: string,
  input: Record<string, unknown>,
  etape: string,
  options?: { intervalleMs?: number; maxTentatives?: number }
): Promise<string[]> {
  const taskId = await creerTache(model, input, etape);
  console.log(`[pipeline:kie] Tâche ${etape} créée (${taskId}), attente…`);
  return attendreTache(taskId, etape, options);
}

/** Télécharge un fichier distant (URL Kie.ai à durée de vie limitée) sur disque. */
export async function telechargerFichier(url: string, chemin: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Téléchargement échoué (${url}) : ${msg}`);
  }
  if (!res.ok) {
    throw new Error(`Téléchargement échoué (${res.status}) pour ${url}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(chemin, buffer);
}
