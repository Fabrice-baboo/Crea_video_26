---
name: chantier
description: "Démarre un nouveau projet ou reprend proprement un projet ancien, en s'ancrant dans son état RÉEL plutôt que dans le souvenir qu'on en a. Tient un fichier vivant CLAUDE.md (rechargé automatiquement par Claude Code) : objectif, stack, état actuel daté, prochaines étapes, journal. Deux modes auto-détectés : AMORCE quand il n'y a pas de CLAUDE.md (cadrer le projet, créer le fichier) ; REPRISE quand il existe (lire ce qui a bougé depuis la dernière fois via git + fichiers, signaler les écarts entre le doc et la réalité, mettre à jour). Conçu pour qui jongle avec beaucoup de projets en parallèle et perd le fil entre deux sessions. Déclencheurs : 'nouveau projet', 'démarre le projet', 'initialise le projet', 'reprendre un projet', 'reprends le chantier', 'remettre à jour', 'où en est ce projet', 'on en était où', 'mets à jour le CLAUDE.md', ou à l'ouverture d'un dossier de projet après une absence."
---

# Chantier

> Reprendre un projet sur sa mémoire est une hypothèse. Le seul état vrai est celui du dépôt.
> Ce skill ancre d'abord, parle ensuite, et laisse une trace que la prochaine session pourra lire.

## ÉTAPE 0 : ancrer avant de parler

Lance le snapshot de l'état réel, puis route selon ce qu'il trouve :

```
bash scripts/etat-projet.sh <chemin_du_projet>
```

Il donne (lecture seule) : branche, derniers commits, modifs non committées, fichiers touchés sur 14 jours, stack détectée, et **le mode** :
- **Pas de `CLAUDE.md`** → route **AMORCE**.
- **`CLAUDE.md` présent** → route **REPRISE**.

Sans accès shell, ancre à la main : `git log --oneline -n 10`, `git status`, lire le `CLAUDE.md` s'il existe. Ne jamais décrire l'état d'un projet sans l'avoir regardé.

## Route AMORCE (projet neuf)

1. Lire ce qui est déjà là (snapshot + README, fichiers de conf). Ne pas redemander ce qui s'infère.
2. Demander seulement les trous qui ne s'infèrent pas, en une fois : **objectif**, **critères de « fait »**, **marché / langue** si pertinent (FR/IT/DE…), **contrainte** majeure. Court.
3. Écrire le `CLAUDE.md` à partir du modèle : **`references/modele-CLAUDE.md`**. Le poser à la racine du projet.
4. Confirmer : fichier créé, et les 1-3 prochaines étapes concrètes inscrites dedans.

## Route REPRISE (projet ancien à remettre à jour)

1. **Lire l'écart** : ce que le `CLAUDE.md` affirme vs ce que le snapshot montre. Le doc dit « TODO : paiement Stripe » mais les commits montrent que c'est fait ? C'est une dérive : signaler.
2. **Restituer en clair** : « depuis le [date] du dernier point : N commits, ces fichiers ont bougé, voici ce qui a avancé / ce qui reste / ce qui a dérivé ». Honnête : si le doc est périmé, le dire.
3. **Mettre à jour le `CLAUDE.md`** : rafraîchir *État actuel* + *Prochaines étapes*, et **ajouter une entrée datée au Journal** (append, on ne réécrit pas l'historique). Protocole : **`references/reprise-etat-reel.md`**.
4. Confirmer l'état final et la prochaine action.

## Règles tenues

- **L'état réel prime sur le doc.** En cas de contradiction, le dépôt a raison ; on corrige le doc, pas l'inverse.
- **Journal en append.** Chaque reprise laisse une entrée datée. La prochaine session démarre informée.
- **Ne pas inventer l'avancement.** « probablement fait » n'est pas « fait » : vérifier dans le code / les commits.
- **Sobre.** Le `CLAUDE.md` reste court et utile, pas un roman. Une section ne reste que si elle sert la prochaine session.
- **Secrets.** Jamais de clé, token ou `.env` recopié dans le `CLAUDE.md`.

## Route TABLEAU / portefeuille (vue d'ensemble)

Quand on demande « où en sont tous mes projets », « fais le point du portefeuille », « lesquels je néglige » :

```
bash scripts/tableau-projets.sh <dossier_parent> [<autre_dossier> ...]
```

Sort un tableau Markdown (affiché direct) : projet, dernier commit, âge, mode, WIP non committé, prochaine étape, **trié du plus négligé au plus récent**. Repère chaque projet via son `.git` ou son `CLAUDE.md`, dans les dossiers donnés et leurs sous-dossiers immédiats.

Pour une vue visuelle à parcourir d'un coup d'œil (pastilles de couleur par ancienneté) :

```
bash scripts/tableau-projets.sh --html portefeuille.html <dossier_parent>
```

Le tableau ne s'invente pas : la « prochaine étape » est lue dans le `CLAUDE.md` de chaque projet (premier point sous *Prochaines étapes*). Donc plus les fichiers sont tenus à jour (route REPRISE), plus le tableau est juste. Lecture seule : le script ne modifie aucun projet.
