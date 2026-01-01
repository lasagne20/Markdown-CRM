# NumberDisplay Configuration

Le composant `NumberDisplay` permet d'afficher des valeurs numériques dans un cercle de progression avec des options de personnalisation étendues.

## Configuration de base

```yaml
display:
  containers:
    - type: number
      title: "Budget Total"
      value: 15000
      unit: "€"
      label: "Montant disponible"
      size: 120
      color: "var(--color-green)"
```

## Options disponibles

| Propriété | Type | Description | Défaut |
|-----------|------|-------------|---------|
| `type` | `'number'` | **Requis** - Type de composant |
| `title` | `string` | Titre affiché au-dessus du cercle | |
| `className` | `string` | Classe CSS personnalisée | |
| `property` | `string` | Nom de la propriété d'où extraire la valeur | |
| `value` | `number` | Valeur statique (si pas de property) | `0` |
| `unit` | `string` | Unité affichée après la valeur (%, €, etc.) | |
| `label` | `string` | Texte affiché sous le cercle | |
| `size` | `number` | Taille du cercle en pixels | `96` |
| `color` | `string` | Couleur de remplissage | `var(--interactive-accent)` |
| `fillLevel` | `number` | Niveau de remplissage forcé (0-1) | Calculé depuis `value` |
| `formula` | `string` | Formule de calcul (`sum`, `avg`, `count`, `min`, `max`) | |

## Exemples d'utilisation

### Affichage d'une propriété numérique

```yaml
display:
  containers:
    - type: number
      property: budget
      unit: "€"
      label: "Budget projet"
      color: "var(--color-blue)"
```

### Pourcentage de completion

```yaml
display:
  containers:
    - type: number
      property: completion
      unit: "%"
      label: "Avancement"
      fillLevel: 0.75  # Force 75% de remplissage même si completion = 100
```

### Calculs avec formules

```yaml
display:
  containers:
    - type: number
      title: "Statistiques"
      formula: sum
      property: montant
      unit: "€"
      label: "Total des montants"
      
    - type: number
      formula: count
      label: "Nombre d'éléments"
      
    - type: number
      formula: avg
      property: note
      unit: "/10"
      label: "Note moyenne"
```

### Configuration avancée

```yaml
display:
  containers:
    - type: line
      className: "dashboard-metrics"
      items:
        - type: number
          title: "Revenus"
          property: revenus
          unit: "€"
          size: 100
          color: "var(--color-green)"
          label: "Total revenus"
          
        - type: number
          title: "Dépenses"
          property: depenses
          unit: "€"
          size: 100
          color: "var(--color-red)"
          label: "Total dépenses"
          
        - type: number
          title: "Bénéfices"
          formula: "revenus - depenses"  # Formule personnalisée
          unit: "€"
          size: 100
          color: "var(--color-blue)"
          label: "Bénéfices nets"
```

## Intégration dans ObjectProperty

Le NumberDisplay peut aussi être utilisé dans les configurations d'affichage d'ObjectProperty :

```yaml
properties:
  projets:
    type: object
    display: tabs
    displayContainer:
      containers:
        - type: line
          items:
            - type: number
              formula: sum
              property: budget
              unit: "€"
              label: "Budget total"
              
            - type: number
              formula: avg
              property: avancement
              unit: "%"
              label: "Avancement moyen"
```

## Styles CSS

Le composant génère les classes suivantes que vous pouvez personnaliser :

```css
.crm-number-display {
  /* Container principal */
}

.crm-number-display-label {
  /* Label sous le cercle */
}

.crm-number-display-error {
  /* Affichage d'erreur */
}
```

## Notes techniques

- Les valeurs sont automatiquement converties en nombre
- Le remplissage du cercle est calculé comme `value / 100` sauf si `fillLevel` est spécifié
- Les formules supportent les opérations sur des tableaux de données
- Compatible avec le système de propriétés existant
- Responsive et adaptatif selon la taille spécifiée