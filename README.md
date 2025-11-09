# Dynamic Fields - Obsidian CRM

Ce projet contient les champs dynamiques pour le plugin Obsidian CRM.

## Installation des dépendances

Pour installer les dépendances Node.js et configurer l'environnement de développement :

```bash
npm install
```

## Scripts disponibles

### Tests

- `npm test` - Lance tous les tests
- `npm run test:watch` - Lance les tests en mode watch (redémarre automatiquement)
- `npm run test:coverage` - Lance les tests avec le rapport de couverture

### Build

- `npm run build` - Compile le TypeScript
- `npm run build:watch` - Compile en mode watch

## Structure du projet

```
src/
├── __tests__/          # Tests unitaires
│   └── Properties/     # Tests pour les propriétés
├── classes/           # Classes principales
├── interfaces/        # Interfaces TypeScript
├── properties/        # Implémentations des propriétés
└── vault/            # Gestion du vault Obsidian
```

## Configuration

- `jest.config.js` - Configuration Jest pour les tests
- `tsconfig.json` - Configuration TypeScript pour la production
- `tsconfig.test.json` - Configuration TypeScript pour les tests
- `package.json` - Dépendances et scripts NPM

## Développement

1. Installer les dépendances : `npm install`
2. Lancer les tests : `npm test`
3. Développer en mode watch : `npm run test:watch`

Les tests utilisent Jest avec jsdom pour simuler l'environnement DOM et des mocks pour les APIs Obsidian.

## Couverture de code

La couverture de code est générée dans le dossier `coverage/` après avoir lancé `npm run test:coverage`.