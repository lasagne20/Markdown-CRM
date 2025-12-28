# Utilisation des ObjectProperty dans les tableaux

## Nouvelle fonctionnalité : Notation `ClassName.propertyName`

Vous pouvez maintenant utiliser la notation `ClassName.propertyName` dans la configuration `class` des tableaux pour afficher directement les éléments d'un ObjectProperty au lieu des instances de classe parente.

### Exemple pratique

Au lieu d'afficher les personnes :
```yaml
# Institution.yaml - Configuration précédente
displays:
  - type: table
    title: "Employés"
    source:
      class: "Personne"
      smartFilter: "children"
    columns:
      - property: "nom"
        label: "Nom"
      - property: "prenom" 
        label: "Prénom"
```

Vous pouvez maintenant afficher directement les postes :
```yaml
# Institution.yaml - Nouvelle configuration
displays:
  - type: table
    title: "Tous les postes"
    source:
      class: "Personne.postes"  # ← Nouvelle notation
      smartFilter: "children"   # Optionnel : filtrer par employés
    columns:
      - property: "entreprise"
        label: "Entreprise"
      - property: "poste"
        label: "Poste"
      - property: "salaire"
        label: "Salaire"
      - property: "_fileName"   # ← Propriété spéciale pour identifier l'origine
        label: "Personne"
```

### Avantages

1. **Affichage direct** : Chaque ligne représente un poste au lieu d'une personne
2. **Données plus granulaires** : Accès direct aux propriétés des objets dans l'ObjectProperty
3. **Compatibilité totale** : Fonctionne avec tous les filtres, conditions et smartFilters existants
4. **Propriétés spéciales** :
   - `_fileName` : Nom de l'instance parente
   - `_parentFile` : Chemin vers l'instance parente

### Cas d'utilisation

- **`Personne.postes`** : Lister tous les postes de toutes les personnes
- **`Institution.projets`** : Afficher tous les projets de toutes les institutions  
- **`Projet.taches`** : Montrer toutes les tâches de tous les projets

### Fonctionnalités supportées

✅ **SmartFilters** : `all`, `children`, `parent`, etc.
✅ **Conditions** : Filtrage sur les propriétés des objets ObjectProperty
✅ **Tri et colonnes** : Accès complet aux propriétés des objets
✅ **Propriétés spéciales** : `_fileName`, `_parentFile` pour traçabilité

### Exemple complet

```yaml
# Institution.yaml
displays:
  - type: table
    title: "Postes des employés"
    source:
      class: "Personne.postes"
      smartFilter: "children"
      conditions:
        - property: "salaire"
          type: "greaterThan"
          value: 50000
    columns:
      - property: "_fileName"
        label: "Employé"
        width: 150
      - property: "poste"
        label: "Poste"
        width: 200
      - property: "entreprise" 
        label: "Entreprise"
        width: 150
      - property: "salaire"
        label: "Salaire"
        width: 100
        format: "currency"
```

Cette configuration affichera tous les postes (avec salaire > 50 000€) des employés de l'institution courante, avec une ligne par poste au lieu d'une ligne par employé.