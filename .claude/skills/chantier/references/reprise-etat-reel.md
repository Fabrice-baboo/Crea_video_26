# Protocole REPRISE — remettre un projet à jour sur son état réel

> Objectif : qu'après cette session, le `CLAUDE.md` dise la vérité du dépôt, et que la
> prochaine session démarre informée. On ne réécrit pas l'histoire ; on l'augmente.

## 1. Ancrer (déjà fait à l'ÉTAPE 0)

Le snapshot de `etat-projet.sh` est la réalité de référence : commits, WIP, fichiers
touchés, stack. Tout ce qui suit se confronte à lui.

## 2. Lire l'écart doc ↔ réel

Comparer ligne à ligne ce que `CLAUDE.md` affirme et ce que le snapshot montre. Classer :

- **Avancé** — le doc disait « à faire », les commits montrent que c'est fait.
- **Reste** — toujours ouvert, confirmé par l'absence de trace dans le code/commits.
- **Dérive** — le doc et la réalité se contredisent (techno changée, étape abandonnée,
  fonctionnalité ajoutée hors plan). C'est le plus important à signaler.

Ne jamais marquer « fait » sur une intuition : ouvrir le fichier / le commit qui le prouve.
« probablement fait » → vérifier ou écrire « à confirmer ».

## 3. Restituer en clair (à l'oral, avant d'éditer)

Format : « Depuis le dernier point du <date> : N commits. Ont bougé : <fichiers clés>.
Avancé : … / Reste : … / Dérive : … ». Si le doc est périmé, le dire franchement.

## 4. Mettre à jour le CLAUDE.md

- **Réécrire `## État actuel — au <date du jour>`** : la photo honnête d'aujourd'hui.
- **Réécrire `## Prochaines étapes`** : reclasser, retirer le fait, ajouter le neuf.
  Garder la 1re ligne nette (elle alimente `tableau-projets.sh`).
- **APPEND au `## Journal`** une entrée datée — ne pas toucher les anciennes :

  ```
  - **<AAAA-MM-JJ>** — Reprise. <N commits depuis le dernier point>. Avancé : … . Dérive corrigée : … . Prochain : … .
  ```

- Corriger toute section devenue fausse (stack, commandes, architecture) pour matcher le réel.
- Rester sobre : supprimer ce qui ne sert plus la prochaine session.

## 5. Confirmer

Récapituler : ce qui a été corrigé dans le doc, l'entrée Journal ajoutée, et la prochaine
action concrète.

## Garde-fous

- **Le dépôt a raison.** En cas de conflit, on corrige le doc, jamais l'inverse.
- **Append-only sur le Journal.** L'historique est une mémoire, pas un brouillon.
- **Dates en absolu.** Pas de « hier » / « la semaine dernière ».
- **Secrets jamais recopiés** dans le `CLAUDE.md`.
