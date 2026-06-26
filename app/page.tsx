import Link from "next/link";
import NavBar from "@/components/NavBar";
import {
  Wand2,
  FileText,
  Palette,
  Mic,
  Globe,
  Zap,
  ArrowRight,
  Video,
  CheckCircle,
} from "lucide-react";

const FONCTIONNALITES = [
  {
    icone: Wand2,
    titre: "Prompt → Vidéo",
    desc: "Décris ton sujet en français, l'IA génère le script, le storyboard et la vidéo animée.",
  },
  {
    icone: FileText,
    titre: "Script personnalisé",
    desc: "Utilise ton propre script pour garder le contrôle total sur le contenu.",
  },
  {
    icone: Palette,
    titre: "10+ styles visuels",
    desc: "Tableau blanc, néon, chalkboard, illustrations, infographies… pour chaque usage.",
  },
  {
    icone: Mic,
    titre: "Voix off IA",
    desc: "4 voix naturelles (2 féminines, 2 masculines) avec narration en français.",
  },
  {
    icone: Globe,
    titre: "Multi-langue",
    desc: "Génère ta vidéo en français, anglais, espagnol, allemand ou italien.",
  },
  {
    icone: Zap,
    titre: "Génération rapide",
    desc: "Moins de 2 minutes pour une vidéo explicative professionnelle complète.",
  },
];

const USAGES = [
  "Formation & e-learning",
  "Marketing & publicité",
  "Contenu pédagogique",
  "Onboarding RH",
  "Communication interne",
  "YouTube & réseaux sociaux",
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <NavBar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-blue-400 text-sm font-medium mb-6">
            <Video className="w-4 h-4" />
            Générateur de vidéos explicatives IA
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-tight mb-6">
            Transforme tes idées en{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              vidéos animées
            </span>{" "}
            en 2 minutes
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Entre un prompt ou un script en français et obtiens une vidéo
            whiteboard professionnelle avec narration IA, musique et animations.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/playground"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl transition-all text-lg shadow-lg shadow-blue-600/20"
            >
              <Wand2 className="w-5 h-5" />
              Créer une vidéo
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/galerie"
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-8 py-4 rounded-xl transition-all text-lg"
            >
              Voir la galerie
            </Link>
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section className="py-20 px-4 bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Tout ce dont tu as besoin
          </h2>
          <p className="text-slate-400 text-center mb-12">
            Un outil complet pour créer des vidéos explicatives professionnelles.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FONCTIONNALITES.map(({ icone: Icone, titre, desc }) => (
              <div
                key={titre}
                className="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-slate-700 transition-all"
              >
                <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center mb-4">
                  <Icone className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{titre}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cas d'usage */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pour tous tes projets
          </h2>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {USAGES.map((u) => (
              <div
                key={u}
                className="flex items-center gap-2 bg-slate-800 rounded-full px-4 py-2 text-sm text-slate-300"
              >
                <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                {u}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center bg-gradient-to-br from-blue-600/20 to-cyan-600/10 rounded-3xl p-12 border border-blue-500/20">
          <h2 className="text-3xl font-bold text-white mb-4">
            Prêt à créer ta première vidéo ?
          </h2>
          <p className="text-slate-400 mb-8">
            En mode mock, la génération est simulée localement. Ajoute ta clé
            API Golpo pour des vidéos réelles.
          </p>
          <Link
            href="/playground"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl transition-all text-lg"
          >
            <Wand2 className="w-5 h-5" />
            Démarrer maintenant
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4 text-center">
        <p className="text-slate-500 text-sm">
          CréaVidéo — Interface française pour{" "}
          <a
            href="https://video.golpoai.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            Golpo AI
          </a>
          . Usage personnel.
        </p>
      </footer>
    </div>
  );
}
