# Markdown CRM - Instructions projet

## Workflow de validation interface

Ce projet est une bibliothèque (`markdown-crm` sur GitHub : lasagne20/Markdown-CRM) consommée par le plugin Obsidian `obsidian-CRM` situé dans :

```
C:\Users\leodu\Documents\1 - Pro\Test plugin obsidian\.obsidian\plugins\obsidian-CRM
```

À la fin de chaque intervention qui modifie l'interface du plugin (affichage, propriétés, modales, display, styles), après validation des tests :

1. Les tests Jest passent : `npm test`
2. `npx tsc --noEmit` ne rapporte pas de nouvelle erreur sur les fichiers modifiés
3. Committer et pousser sur `origin/main` (demander l'autorisation utilisateur pour chaque push)
4. Lancer dans le dossier du plugin obsidian-CRM :

```
npm update markdown-CRM --force && npm run build
```

⚠️ `npm update` ne re-résout pas les dépendances GitHub vers les nouveaux commits (lock figé). Si "up to date" s'affiche alors que des commits viennent d'être poussés :

```
rm -rf node_modules/markdown-crm && npm install github:lasagne20/Markdown-CRM --force
```

⚠️ Après toute modification CSS dans `src/styles/styles.css` (la lib), copier le fichier vers `styles.css` du plugin (le plugin charge sa propre copie) :

```
cp "C:\Users\leodu\Documents\1 - Pro\Markdown CRM\src\styles\styles.css" "C:\Users\leodu\Documents\1 - Pro\Test plugin obsidian\.obsidian\plugins\obsidian-CRM\styles.css"
```

Puis vérifier les correctifs dans `node_modules/markdown-crm` (grep sur un marqueur du dernier commit) et relancer `npm run build`.

Détails complets : voir `.vibe/skills/start/SKILL.md`.

## Structure

- `src/` : code de la bibliothèque (vault, properties, Config, display, utils)
- `__tests__/` : tests Jest (config : `jest.config.js`, `jest.setup.js`)
- TypeScript strict ; `baseUrl: "."` + `paths` dans `tsconfig.json` (avertissement de dépréciation TS 6/7 ignoré volontairement)
