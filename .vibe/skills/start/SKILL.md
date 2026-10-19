---
name: start
description: >-
  Ce skill permet de maj le projet Markdown-CRM, d'avoir sa dernière version dans Obsidian-CRM et de testé directement les nouvelles fonctionnalités dans obsidian.
---

# start

Workflow de synchronisation Markdown CRM → Obsidian-CRM.

## Quand l'exécuter

À la fin de chaque intervention qui modifie l'interface du plugin (affichage, propriétés, modales, display, styles), après validation des tests :

1. les tests Jest de Markdown CRM passent (`npm test` dans `C:\Users\leodu\Documents\1 - Pro\Markdown CRM`)
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

- `npm update markdown-CRM --force` : récupère la dernière version de la lib `markdown-crm` (GitHub : lasagne20/Markdown-CRM) dans `node_modules`
- `npm run build` : recompile `main.js` via esbuild avec la lib à jour

## Après le build

- Le plugin doit être rechargé dans Obsidian (ou Obsidian relancé) pour que `main.js` soit pris en compte
- Vérifier dans la console Obsidian (Ctrl+Shift+I) que le plugin charge sans erreur

## Notes

- Si `npm update markdown-CRM --force` ne récupère pas les derniers commits du repo GitHub, supprimer le dossier `node_modules/markdown-crm` puis relancer `npm install markdown-crm` avant le build
- Les tests du plugin obsidian-CRM se lancent avec `npm test` dans son propre dossier (config Jest locale)
