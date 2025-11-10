# Configuration d'affichage (Display)

La configuration d'affichage permet de personnaliser complètement la présentation des propriétés d'une classe dans l'interface. Vous pouvez organiser vos propriétés en sections, onglets, et zones repliables.

## Table des matières

- [Structure de base](#structure-de-base)
- [Types de conteneurs](#types-de-conteneurs)
  - [Line - Disposition en ligne](#line---disposition-en-ligne)
  - [Column - Disposition en colonne](#column---disposition-en-colonne)
  - [Tabs - Onglets](#tabs---onglets)
  - [Fold - Zone repliable](#fold---zone-repliable)
- [Exemples complets](#exemples-complets)

## Structure de base

La configuration d'affichage se place dans la section `display` du fichier YAML de configuration de classe :

```yaml
display:
  containers:
    - type: line | column | tabs | fold
      title: "Titre de la section"
      className: "classe-css-personnalisee"
      properties:
        - propriete1
        - propriete2
```

### Propriétés communes

Tous les conteneurs partagent ces propriétés de base :

| Propriété | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `type` | string | ✅ | Type de conteneur (`line`, `column`, `tabs`, `fold`) |
| `title` | string | ❌ | Titre affiché au-dessus du conteneur |
| `className` | string | ❌ | Classe CSS personnalisée pour le style |
| `properties` | string[] | ❌* | Liste des noms de propriétés à afficher |

*Obligatoire sauf pour le type `tabs` qui utilise `tabs` à la place

## Types de conteneurs

### Line - Disposition en ligne

Affiche les propriétés sur une seule ligne horizontale, idéal pour des informations courtes.

```yaml
- type: line
  title: "Informations de base"
  className: "basic-info"
  properties:
    - nom
    - email
    - telephone
```

**Cas d'usage :**
- Informations d'identification (nom, prénom, etc.)
- Données de contact
- Statuts et badges

**Rendu visuel :**
```
┌─────────────────────────────────────┐
│ Informations de base                │
├─────────────────────────────────────┤
│ [Nom] [Email] [Téléphone]          │
└─────────────────────────────────────┘
```

### Column - Disposition en colonne

Affiche les propriétés en colonne verticale, parfait pour des champs plus larges.

```yaml
- type: column
  title: "Description détaillée"
  className: "details-column"
  properties:
    - description
    - notes
    - commentaires
```

**Cas d'usage :**
- Champs de texte multiligne
- Descriptions longues
- Notes et commentaires

**Rendu visuel :**
```
┌─────────────────────────────────────┐
│ Description détaillée               │
├─────────────────────────────────────┤
│ [Description...................]    │
│                                     │
│ [Notes..........................]    │
│                                     │
│ [Commentaires...................]    │
└─────────────────────────────────────┘
```

### Tabs - Onglets

Organise les propriétés dans des onglets cliquables pour économiser l'espace vertical.

```yaml
- type: tabs
  title: "Détails du contact"
  className: "contact-tabs"
  tabs:
    - name: "Entreprise"
      properties:
        - nomEntreprise
        - poste
        - secteur
    - name: "Adresse"
      properties:
        - adresse
        - ville
        - codePostal
    - name: "Suivi"
      properties:
        - dateCreation
        - dernierContact
        - priorite
```

**Structure des tabs :**

| Propriété | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `tabs` | array | ✅ | Liste des onglets |
| `tabs[].name` | string | ✅ | Nom de l'onglet (affiché dans l'en-tête) |
| `tabs[].properties` | string[] | ✅ | Propriétés à afficher dans cet onglet |

**Cas d'usage :**
- Séparer des catégories d'informations
- Réduire l'encombrement visuel
- Grouper des informations logiquement liées

**Rendu visuel :**
```
┌─────────────────────────────────────┐
│ Détails du contact                  │
├─────────────────────────────────────┤
│ [Entreprise] [Adresse] [Suivi]     │
├─────────────────────────────────────┤
│ Contenu de l'onglet actif           │
│ [Propriétés...]                     │
└─────────────────────────────────────┘
```

**Interactions :**
- Cliquer sur un onglet affiche son contenu
- Un seul onglet visible à la fois
- Le premier onglet est actif par défaut
- Animation de transition entre onglets

### Fold - Zone repliable

Crée une section repliable (accordéon) pour masquer/afficher des informations secondaires.

```yaml
- type: fold
  foldTitle: "Informations avancées"
  className: "advanced-fold"
  properties:
    - metadata
    - tags
    - historique
```

**Propriété spécifique :**

| Propriété | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `foldTitle` | string | ✅ | Texte du bouton de pliage/dépliage |

**Cas d'usage :**
- Informations rarement consultées
- Données techniques ou avancées
- Historique et métadonnées
- Réduire la longueur de la page

**Rendu visuel :**

*État replié :*
```
┌─────────────────────────────────────┐
│ ▶ Informations avancées            │
└─────────────────────────────────────┘
```

*État déplié :*
```
┌─────────────────────────────────────┐
│ ▼ Informations avancées            │
├─────────────────────────────────────┤
│ [Metadata......................]    │
│ [Tags...........................]    │
│ [Historique.....................]    │
└─────────────────────────────────────┘
```

**Interactions :**
- Cliquer sur l'en-tête bascule l'état
- Animation fluide d'ouverture/fermeture
- Démarre en position repliée par défaut

## Exemples complets

### Exemple 1 : Configuration simple

```yaml
display:
  containers:
    - type: line
      title: "Identification"
      properties:
        - nom
        - prenom
        - email
    
    - type: column
      title: "Notes"
      properties:
        - description
```

### Exemple 2 : Configuration avec onglets

```yaml
display:
  containers:
    - type: line
      title: "Informations principales"
      properties:
        - nom
        - email
    
    - type: tabs
      title: "Détails"
      tabs:
        - name: "Professionnel"
          properties:
            - entreprise
            - poste
            - telephone
        - name: "Personnel"
          properties:
            - adresse
            - dateNaissance
```

### Exemple 3 : Configuration complète (Contact)

```yaml
display:
  containers:
    # Section toujours visible
    - type: line
      title: "Informations personnelles"
      className: "contact-info-section"
      properties:
        - nom
        - email
        - telephone
    
    # Onglets pour les détails
    - type: tabs
      title: "Détails du contact"
      className: "contact-details-tabs"
      tabs:
        - name: "Entreprise"
          properties:
            - infosEntreprise
            - adresse
        - name: "Suivi"
          properties:
            - dateRencontre
            - priorite
            - actif
    
    # Zone repliable pour les notes
    - type: fold
      foldTitle: "Notes supplémentaires"
      className: "contact-notes-fold"
      properties:
        - notes
```

### Exemple 4 : Configuration pour un projet

```yaml
display:
  containers:
    - type: line
      title: "Vue d'ensemble"
      properties:
        - nomProjet
        - statut
        - priorite
    
    - type: tabs
      title: "Gestion du projet"
      tabs:
        - name: "Planning"
          properties:
            - dateDebut
            - dateFin
            - budget
        - name: "Équipe"
          properties:
            - responsable
            - equipe
            - client
        - name: "Livrables"
          properties:
            - livrables
            - jalons
    
    - type: fold
      foldTitle: "Détails techniques"
      properties:
        - technologie
        - infrastructure
        - documentation
    
    - type: column
      title: "Description"
      properties:
        - description
        - objectifs
```

## Styles CSS personnalisés

Vous pouvez personnaliser l'apparence en utilisant les classes CSS suivantes :

### Classes globales

```css
/* Wrapper de chaque conteneur */
.display-container-wrapper { }

/* Titre de section */
.container-section-title { }

/* Conteneurs de base */
.metadata-line { }
.metadata-column { }
```

### Classes pour les onglets

```css
/* Container principal des onglets */
.metadata-tabs-container { }

/* En-têtes des onglets */
.tab-headers { }
.tab-header { }
.tab-header.active { }
.tab-header:hover { }

/* Contenus des onglets */
.tab-contents { }
.tab-content { }
.tab-content.active { }
```

### Classes pour les folds

```css
/* Container principal du fold */
.metadata-fold-container { }

/* En-tête cliquable */
.fold-header { }
.fold-header.expanded { }
.fold-header:hover { }

/* Contenu repliable */
.fold-content { }
.fold-content.collapsed { }
```

### Exemple de personnalisation

```css
/* Personnaliser les onglets d'entreprise */
.contact-details-tabs .tab-header {
    background: #f0f0f0;
    border-radius: 5px 5px 0 0;
}

.contact-details-tabs .tab-header.active {
    background: white;
    color: #0066cc;
}

/* Personnaliser le fold des notes */
.contact-notes-fold .fold-header {
    background: linear-gradient(to right, #667eea, #764ba2);
    color: white;
}
```

## Bonnes pratiques

### Organisation de l'information

1. **Hiérarchie claire** : Placez les informations les plus importantes en haut
2. **Groupement logique** : Regroupez les propriétés liées ensemble
3. **Éviter la surcharge** : Ne mettez pas trop de propriétés dans un seul conteneur

### Utilisation des types

- **Line** : Pour 2-4 propriétés courtes qui vont bien ensemble
- **Column** : Pour les champs texte longs ou les listes
- **Tabs** : Quand vous avez 3+ groupes distincts de propriétés
- **Fold** : Pour les informations secondaires ou rarement consultées

### Performance

- Limitez le nombre d'onglets à 5-7 maximum
- Ne créez pas plus de 2-3 folds par page
- Groupez intelligemment pour réduire le scrolling

### Accessibilité

- Donnez des titres clairs et descriptifs
- Utilisez des noms d'onglets concis
- Les folds doivent avoir un `foldTitle` explicite

## Voir aussi

- [Property Types](./Property-Types.md) - Types de propriétés disponibles
- [Architecture](./Architecture.md) - Architecture du système
- [Installation](./Installation.md) - Guide d'installation
