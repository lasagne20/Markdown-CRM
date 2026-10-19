---
name: start
description: >-
  Ce skill permet de maj le projet Markdown-CRM, d'avoir sa dernière version dans Obsidian-CRM et de testé directement les nouvelles fonctionnalités dans obsidian.
---

# start

Workflow de synchronisation Markdown CRM → Obsidian-CRM.

## Prérequis : publier la lib sur GitHub

Le plugin consomme `markdown-crm` depuis `github:lasagne20/Markdown-CRM`. La lib doit donc être **commitée et poussée sur `origin/main`** avant la synchro :

```
cd "C:\Users\leodu\Documents\1 - Pro\Markdown CRM"
git add <fichiers> && git commit
git push origin main   # demander l'autorisation utilisateur à chaque fois
```

## Quand exécuter la synchro

À la fin de chaque intervention qui modifie l'interface du plugin (affichage, propriétés, modales, display, styles), après validation :

1. les tests Jest de Markdown CRM passent (`npm test`)
2. `npx tsc --noEmit` ne rapporte pas de nouvelle erreur sur les fichiers modifiés

## Commande à lancer

Dans le dossier du plugin Obsidian :

```
C:\Users\leodu\Documents\1 - Pro\Test plugin obsidian\.obsidian\plugins\obsidian-CRM
```

exécuter :

```
npm update markdown-CRM --force && npm run build
```

⚠️ **Important** : `npm update` seul ne re-résout PAS une dépendance GitHub vers les nouveaux commits (le package-lock fige le hash). Si `npm update` affiche "up to date" alors que des commits viennent d'être poussés, forcer la réinstallation :

```
rm -rf node_modules/markdown-crm && npm install github:lasagne20/Markdown-CRM --force
```

Puis vérifier que les derniers correctifs sont présents (grep sur un marqueur du dernier commit dans `node_modules/markdown-crm/src/...`) avant de builder :

```
npm run build
```

## Après le build

- Le plugin doit être rechargé dans Obsidian (ou Obsidian relancé) pour que `main.js` soit pris en compte
- Vérifier dans la console Obsidian (Ctrl+Shift+I) que le plugin charge sans erreur

## Notes

- Les tests du plugin obsidian-CRM se lancent avec `npm test` dans son propre dossier (config Jest locale)
- Les warnings npm (peer dependency @codemirror/state, audit) sont préexistants et sans impact sur le build
