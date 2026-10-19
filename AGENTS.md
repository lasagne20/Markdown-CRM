# Markdown CRM - Instructions projet

## Workflow de validation interface

Ce projet est une bibliothèque (`markdown-crm` sur GitHub : lasagne20/Markdown-CRM) consommée par le plugin Obsidian `obsidian-CRM` situé dans :

```
C:\Users\leodu\Documents\1 - Pro\Test plugin obsidian\.obsidian\plugins\obsidian-CRM
```

À la fin de chaque intervention qui modifie l'interface du plugin (affichage, propriétés, modales, display, styles), après validation des tests :

1. Les tests Jest passent : `npm test`
2. `npx tsc --noEmit` ne rapporte pas de nouvelle erreur sur les fichiers modifiés
3. Lancer dans le dossier du plugin obsidian-CRM :

```
npm update markdown-CRM --force && npm run build
```

Cela met à jour la lib dans `node_modules` du plugin et recompile `main.js` pour qu'Obsidian charge la nouvelle version après rechargement du plugin.

Détails complets : voir `.vibe/skills/start/SKILL.md`.

## Structure

- `src/` : code de la bibliothèque (vault, properties, Config, display, utils)
- `__tests__/` : tests Jest (config : `jest.config.js`, `jest.setup.js`)
- TypeScript strict ; `baseUrl: "."` + `paths` dans `tsconfig.json` (avertissement de dépréciation TS 6/7 ignoré volontairement)
