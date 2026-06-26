# Modèle CLAUDE.md — route AMORCE

> Gabarit à recopier à la racine du projet, puis à remplir. Garder court.
> Remplacer tous les `<…>`. Supprimer une section si elle ne sert pas la prochaine session.
> Convertir les dates relatives en absolues (« aujourd'hui » → 2026-06-24).

---

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Objectif

<Une à trois phrases : ce que fait ce projet et pour qui. Le « pourquoi », pas la liste de features.>

## Définition de « fait »

<Critères concrets et vérifiables qui disent que le projet / la version vise juste.
- [ ] critère 1
- [ ] critère 2>

## Stack & commandes

<Langage / framework détectés. Commandes réelles, vérifiées :>
- Installer : `<cmd>`
- Lancer (dev) : `<cmd>`
- Build : `<cmd>`
- Tests : `<cmd>`  <!-- ou « pas de tests » -->

## Contexte non déductible du code

<Ce qu'on ne peut PAS deviner en lisant le repo : marché / langue cible (FR/IT/DE…),
contrainte majeure (deadline, budget, dépendance externe, choix imposé), décisions déjà tranchées.>

## Architecture (vue d'ensemble)

<Le « gros tableau » qui demande de lire plusieurs fichiers pour être compris.
Le flux principal, les frontières importantes. Pas l'arborescence — elle se découvre.>

## État actuel — au <AAAA-MM-JJ>

<Où on en est VRAIMENT aujourd'hui. Ce qui marche, ce qui est en chantier.>

## Prochaines étapes

1. <action concrète suivante>
2. <…>
3. <…>

## Journal

- **<AAAA-MM-JJ>** — Amorce du projet. <ce qui a été cadré / créé.>
```

---

## Rappels en remplissant

- **Vérifier les commandes** avant de les inscrire (les lancer ou lire les scripts), ne pas les supposer.
- **Pas de secrets** : aucune clé, token, contenu de `.env`.
- La 1re ligne de **Prochaines étapes** est lue par `tableau-projets.sh` → la rendre claire et actionnable.
- Dater **État actuel** et l'entrée **Journal** en absolu.
