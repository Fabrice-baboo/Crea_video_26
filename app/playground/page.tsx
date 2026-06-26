"use client";

import { useState, useCallback } from "react";
import NavBar from "@/components/NavBar";
import VideoForm from "@/components/VideoForm";
import StatusPoller from "@/components/StatusPoller";
import VideoCard from "@/components/VideoCard";
import { Info } from "lucide-react";
import type { ParamsGeneration, ReponseGeneration, ReponseStatut, Video } from "@/lib/types";

type Etape = "formulaire" | "generation" | "resultat";

export default function PlaygroundPage() {
  const [etape, setEtape] = useState<Etape>("formulaire");
  const [jobInfo, setJobInfo] = useState<ReponseGeneration | null>(null);
  const [videoResultat, setVideoResultat] = useState<Video | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function handleSoumettre(params: ParamsGeneration) {
    setChargement(true);
    setErreur(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.erreur || `Erreur HTTP ${res.status}`);
      }

      const data: ReponseGeneration = await res.json();
      setJobInfo(data);
      setEtape("generation");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setChargement(false);
    }
  }

  const handleTermine = useCallback((statut: ReponseStatut) => {
    if (statut.video) {
      setVideoResultat(statut.video);
      setEtape("resultat");
    }
  }, []);

  const handleErreur = useCallback((msg: string) => {
    setErreur(msg);
    setEtape("formulaire");
  }, []);

  function recommencer() {
    setEtape("formulaire");
    setJobInfo(null);
    setVideoResultat(null);
    setErreur(null);
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <NavBar />

      <div className="max-w-2xl mx-auto">
        {/* En-tête */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            Créer une vidéo
          </h1>
          <p className="text-slate-400">
            Décris ton sujet, choisis ton style et génère ta vidéo explicative.
          </p>
        </div>

        {/* Bandeau mock — affiché uniquement si le mode mock est forcé */}
        {process.env.NEXT_PUBLIC_MOCK_MODE === "true" && (
          <div className="mb-6 flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300">
              <strong>Mode mock actif</strong> — La vidéo générée est une vidéo
              de démonstration. Pour des vidéos réelles, configure les clés
              OpenRouter / ElevenLabs / Kie dans{" "}
              <code className="bg-amber-500/20 px-1 rounded text-xs">.env.local</code>{" "}
              et passe{" "}
              <code className="bg-amber-500/20 px-1 rounded text-xs">NEXT_PUBLIC_MOCK_MODE=false</code>.
            </p>
          </div>
        )}

        {/* Erreur */}
        {erreur && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
            {erreur}
          </div>
        )}

        {/* Étapes */}
        {etape === "formulaire" && (
          <VideoForm onSoumettre={handleSoumettre} chargement={chargement} />
        )}

        {etape === "generation" && jobInfo && (
          <div className="space-y-4">
            <StatusPoller
              jobId={jobInfo.job_id}
              onTermine={handleTermine}
              onErreur={handleErreur}
            />
            <p className="text-center text-xs text-slate-500">
              {process.env.NEXT_PUBLIC_MOCK_MODE === "true"
                ? "Simulation : ~15 secondes en mode mock"
                : "Génération en cours : ~30 à 90 secondes"}
            </p>
          </div>
        )}

        {etape === "resultat" && videoResultat && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 text-green-400 text-sm font-medium mb-4">
                ✓ Vidéo générée avec succès !
              </div>
            </div>

            <VideoCard video={videoResultat} />

            <div className="flex gap-3">
              <button
                onClick={recommencer}
                className="flex-1 py-3 rounded-xl font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all"
              >
                Créer une autre vidéo
              </button>
              <a
                href="/galerie"
                className="flex-1 py-3 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-all text-center"
              >
                Voir la galerie
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
