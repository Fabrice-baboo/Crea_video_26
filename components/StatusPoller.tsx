"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { ReponseStatut } from "@/lib/types";

interface Props {
  jobId: string;
  onTermine: (statut: ReponseStatut) => void;
  onErreur: (msg: string) => void;
}

const INTERVALLE_MS = 2000; // polling toutes les 2s

export default function StatusPoller({ jobId, onTermine, onErreur }: Props) {
  const [statut, setStatut] = useState<ReponseStatut | null>(null);
  const [tentatives, setTentatives] = useState(0);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/status/${jobId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ReponseStatut = await res.json();
      setStatut(data);
      setTentatives((t) => t + 1);

      if (data.statut === "termine") {
        onTermine(data);
      } else if (data.statut === "erreur") {
        onErreur(data.message || "Erreur lors de la génération");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur réseau";
      onErreur(msg);
    }
  }, [jobId, onTermine, onErreur]);

  useEffect(() => {
    poll();
    const intervalle = setInterval(async () => {
      if (statut?.statut === "termine" || statut?.statut === "erreur") {
        clearInterval(intervalle);
        return;
      }
      poll();
    }, INTERVALLE_MS);

    return () => clearInterval(intervalle);
  }, [poll, statut?.statut]);

  const progression = statut?.progression ?? 0;
  const message = statut?.message ?? "Initialisation…";

  return (
    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {statut?.statut === "termine" ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : statut?.statut === "erreur" ? (
            <XCircle className="w-5 h-5 text-red-400" />
          ) : (
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          )}
          <span className="font-semibold text-white text-sm">
            {statut?.statut === "termine"
              ? "Vidéo prête !"
              : statut?.statut === "erreur"
              ? "Erreur de génération"
              : "Génération en cours…"}
          </span>
        </div>
        <span className="text-sm font-bold text-blue-400">{progression}%</span>
      </div>

      {/* Barre de progression */}
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${progression}%` }}
        />
      </div>

      {/* Message */}
      <p className="text-xs text-slate-400">{message}</p>

      {/* ID du job */}
      <p className="text-xs text-slate-600 font-mono">Job : {jobId}</p>
    </div>
  );
}
