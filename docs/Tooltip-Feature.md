# Tooltip Feature

## Description

Le système de tooltip permet d'afficher des info-bulles au survol de l'icône de chaque propriété. Cette fonctionnalité améliore l'expérience utilisateur en fournissant des informations contextuelles.

## Caractéristiques

- ✅ **Affichage au survol**: L'info-bulle apparaît quand on survole l'icône de la propriété
- ✅ **Accessibilité**: Support des lecteurs d'écran via l'attribut `aria-label`
- ✅ **Configuration YAML**: Définition des tooltips directement dans les fichiers de configuration
- ✅ **Support universel**: Fonctionne avec tous les types de propriétés
- ✅ **Optionnel**: Aucun tooltip n'est obligatoire, le système reste rétrocompatible

## Utilisation

### 1. Via le constructeur (programmation)

```typescript
const nameProperty = new TextProperty("nom", vault, {
    icon: "user",
    tooltip: "Nom de famille de la personne"
});

const ageProperty = new NumberProperty("age", vault, "ans", {
    icon: "calendar",
    tooltip: "Âge de la personne en années"
});
```

### 2. Via la configuration YAML (recommandé)

```yaml
properties:
  nom:
    type: TextProperty
    title: Nom complet
    icon: 📝
    tooltip: "Nom de famille de la personne"
  
  age:
    type: NumberProperty
    title: Âge
    icon: 📅
    unit: ans
    tooltip: "Âge de la personne en années"
  
  email:
    type: EmailProperty
    title: Email
    icon: 📧
    tooltip: "Adresse email principale pour le contact"
  
  statut:
    type: SelectProperty
    title: Statut
    icon: 🏷️
    tooltip: "Statut actuel dans le système"
    options:
      - name: Actif
        color: green
      - name: Inactif
        color: red
```

### 3. Propriétés imbriquées (ObjectProperty)

```yaml
properties:
  adresse:
    type: ObjectProperty
    title: Adresse complète
    icon: 🏠
    tooltip: "Adresse postale complète"
    properties:
      rue:
        type: TextProperty
        title: Rue
        tooltip: "Numéro et nom de rue"
      
      ville:
        type: TextProperty
        title: Ville
        tooltip: "Nom de la ville"
      
      codePostal:
        type: TextProperty
        title: Code postal
        tooltip: "Code postal à 5 chiffres"
```

## Types de propriétés supportés

Tous les types de propriétés supportent les tooltips :

- `Property` (base)
- `TextProperty`
- `NumberProperty`
- `DateProperty`
- `SelectProperty`
- `BooleanProperty`
- `EmailProperty`
- `PhoneProperty`
- `FileProperty`
- `LinkProperty`
- `MediaProperty`
- `ObjectProperty`
- `ClasseProperty`
- `FormulaProperty`
- Et tous les autres types dérivés...

## Exemples pratiques

### Configuration d'une classe "Personne"

```yaml
name: Personne
icon: 👤
description: Gestion des personnes

properties:
  id:
    type: IdProperty
    title: Identifiant
    icon: 🔑
    static: true
    tooltip: "Identifiant unique généré automatiquement"
  
  nom:
    type: TextProperty
    title: Nom
    icon: 📝
    tooltip: "Nom de famille"
  
  prenom:
    type: TextProperty
    title: Prénom
    icon: 👤
    tooltip: "Prénom usuel"
  
  dateNaissance:
    type: DateProperty
    title: Date de naissance
    icon: 📅
    tooltip: "Date de naissance au format JJ/MM/AAAA"
  
  telephone:
    type: PhoneProperty
    title: Téléphone
    icon: 📞
    tooltip: "Numéro de téléphone principal (fixe ou mobile)"
  
  email:
    type: EmailProperty
    title: Email
    icon: 📧
    tooltip: "Adresse email principale pour le contact"
```

### Configuration d'une classe "Projet"

```yaml
name: Projet
icon: 📁
description: Gestion des projets

properties:
  titre:
    type: TextProperty
    title: Titre du projet
    icon: 📝
    tooltip: "Titre court et descriptif du projet"
  
  budget:
    type: NumberProperty
    title: Budget
    icon: 💰
    unit: €
    tooltip: "Budget total alloué au projet en euros"
  
  dateDebut:
    type: DateProperty
    title: Date de début
    icon: 📅
    tooltip: "Date de démarrage du projet"
  
  dateFin:
    type: DateProperty
    title: Date de fin
    icon: 🏁
    tooltip: "Date de fin prévue du projet"
  
  priorite:
    type: SelectProperty
    title: Priorité
    icon: ⭐
    tooltip: "Niveau de priorité du projet"
    options:
      - name: Haute
        color: red
      - name: Moyenne
        color: orange
      - name: Basse
        color: green
  
  actif:
    type: BooleanProperty
    title: Projet actif
    icon: ✅
    tooltip: "Cochez si le projet est actuellement en cours"
```

## Bonnes pratiques

### Rédaction des tooltips

1. **Soyez concis**: Un tooltip doit être court et informatif (1-2 phrases maximum)
2. **Soyez explicite**: Expliquez clairement ce que la propriété représente
3. **Donnez des exemples**: Si utile, indiquez le format attendu
4. **Évitez la redondance**: Ne répétez pas simplement le titre de la propriété

### Exemples de bons tooltips

✅ **Bon**:
```yaml
email:
  type: EmailProperty
  title: Email
  tooltip: "Adresse email principale pour le contact"
```

✅ **Bon avec format**:
```yaml
telephone:
  type: PhoneProperty
  title: Téléphone
  tooltip: "Numéro au format +33 6 12 34 56 78"
```

✅ **Bon avec contexte**:
```yaml
statut:
  type: SelectProperty
  title: Statut
  tooltip: "Statut actuel dans le processus de recrutement"
```

❌ **À éviter** (redondant):
```yaml
email:
  type: EmailProperty
  title: Email
  tooltip: "Email"  # Trop court, n'apporte rien
```

❌ **À éviter** (trop long):
```yaml
email:
  type: EmailProperty
  title: Email
  tooltip: "Cette propriété permet de saisir l'adresse email de la personne. L'email sera utilisé pour envoyer des notifications et des messages. Assurez-vous que l'adresse est valide et que la personne y a accès régulièrement."  # Trop verbeux
```

## Accessibilité

Le système de tooltip implémente deux mécanismes complémentaires :

1. **`title` attribute**: Tooltip visuel natif du navigateur
2. **`aria-label` attribute**: Texte accessible aux lecteurs d'écran

Cette double implémentation garantit que l'information est accessible à tous les utilisateurs, avec ou sans handicap visuel.

## Tests

Le système inclut une couverture de tests complète :

- **23 tests de rendu**: Validation de l'affichage des tooltips
- **15 tests de configuration**: Validation du chargement depuis YAML
- **Tests d'accessibilité**: Vérification des attributs `aria-label` et `title`
- **Tests de cas limites**: Texte vide, très long, caractères spéciaux

Pour exécuter les tests :

```powershell
# Tests de rendu des tooltips
npm test -- Property.tooltip

# Tests de configuration
npm test -- ConfigLoader.tooltip

# Tous les tests
npm test
```

## Migration

Le système de tooltip est **100% rétrocompatible**. Les propriétés existantes sans tooltip continuent de fonctionner normalement. Pour ajouter des tooltips à une configuration existante, il suffit d'ajouter le champ `tooltip` aux propriétés souhaitées.

### Avant (sans tooltip)

```yaml
properties:
  nom:
    type: TextProperty
    title: Nom
    icon: 📝
```

### Après (avec tooltip)

```yaml
properties:
  nom:
    type: TextProperty
    title: Nom
    icon: 📝
    tooltip: "Nom de famille de la personne"
```

Aucun autre changement n'est nécessaire !
