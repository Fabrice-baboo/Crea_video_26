"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Video, Sparkles, LayoutGrid } from "lucide-react";

const liens = [
  { href: "/", label: "Accueil", icone: Sparkles },
  { href: "/playground", label: "Créer", icone: Video },
  { href: "/galerie", label: "Galerie", icone: LayoutGrid },
];

export default function NavBar() {
  const chemin = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Video className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">
            Créa<span className="text-blue-400">Vidéo</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {liens.map(({ href, label, icone: Icone }) => {
            const actif = chemin === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  actif
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icone className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Badge mode */}
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Mode mock
          </span>
        </div>
      </div>
    </header>
  );
}
