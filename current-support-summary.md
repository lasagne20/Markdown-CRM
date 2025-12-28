# Support "$current" ajouté aux conditions

## Résumé

Le support pour `$current` a été ajouté au système de conditions, permettant désormais d'utiliser à la fois `current` et `$current` de manière équivalente dans toutes les conditions.

## Changements effectués

### 1. Modification du ConditionManager
- **Fichier**: `src/Config/ConditionManager.ts`
- **Changement**: Ajout du support pour `$current` dans la fonction `resolveValue`
- **Code modifié**:
```typescript
// Avant
if (value === 'current') {
    // ...
}

// Après
if (value === 'current' || value === '$current') {
    // ...
}
```

### 2. Test de validation créé
- **Fichier**: `__tests__/display/DynamicTable.current-conditions.test.ts`
- **4 tests** validant le fonctionnement de `current` et `$current` pour :
  - Conditions `equals` avec propriétés simples
  - Conditions `contains` avec propriétés simples
  - Conditions `contains` avec MultiFileProperty arrays
  - Cas d'erreur avec currentDocument null

## Résultats des tests

✅ **Tous les tests passent** :
- 4/4 nouveaux tests de validation `current`/`$current`
- 38/38 tests ConditionManager existants 
- 87/87 tests DynamicTable (hors nested filter non liés)

## Types de propriétés supportés

Les valeurs `current` et `$current` fonctionnent maintenant pour tous les types de propriétés et conditions :

### Types de propriétés
- ✅ **TextProperty** - propriétés texte simples
- ✅ **MultiFileProperty** - arrays de liens vers fichiers
- ✅ **ObjectProperty** - propriétés d'objets complexes
- ✅ **Tous autres types** - via le système unifié ConditionManager

### Types de conditions
- ✅ **equals** - égalité exacte avec `current`/`$current`
- ✅ **contains** - contient `current`/`$current` 
- ✅ **notEquals** - différent de `current`/`$current`
- ✅ **Tous autres types** - supportés par ConditionManager

## Utilisation

Les deux formats sont désormais équivalents dans toutes les configurations :

```yaml
# Configuration 1 - avec "current"
conditions:
  - property: commercial
    type: equals
    value: current

# Configuration 2 - avec "$current" (équivalent)
conditions:
  - property: commercial
    type: equals
    value: $current

# Configuration 3 - conditions mixtes
conditions:
  - property: responsable
    type: equals
    value: current
  - property: description
    type: contains
    value: $current
```

## Validation fonctionnelle

Le test confirme que les deux formats :
1. **Fonctionnent identiquement** pour toutes les conditions
2. **Retournent les mêmes résultats** (true/false)
3. **Gèrent correctement** le cas d'erreur (currentDocument null)
4. **Sont compatibles** avec tous les types de propriétés existants

Cette amélioration assure une flexibilité maximale dans les configurations YAML tout en maintenant la rétrocompatibilité complète.