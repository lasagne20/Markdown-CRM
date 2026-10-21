# ThreeDModelProperty

Propriété média 3D : rend les objets 3D directement dans la fiche et ouvre le
fichier source (FreeCAD) avec l'application par défaut de l'OS.

Classe : `src/properties/3DModelProperty.ts` — type : `3dmodel` — hérite de `MediaProperty`.

## Configuration YAML

```yaml
properties:
  Modele3D:
    type: 3DModelProperty        # ou ThreeDModelProperty
    title: Modele3D
    icon: cube-3d
    openLabel: "Ouvrir dans FreeCAD"   # optionnel, libellé du bouton
```

| Option      | Type   | Défaut                   | Description                                  |
|-------------|--------|--------------------------|----------------------------------------------|
| `title`     | string | —                        | Titre affiché au-dessus de la propriété       |
| `icon`      | string | `box`                    | Icône Obsidian de la propriété               |
| `openLabel` | string | `Ouvrir dans FreeCAD`    | Libellé du bouton d'ouverture du fichier     |
| `tooltip`   | string | —                        | Infobulle                                    |

## Comportement selon l'extension

### GLB / GLTF
- Vérifie que le fichier existe dans le vault.
- Rend le modèle dans un canvas three.js interactif (rotation, zoom, pan via
  OrbitControls) : centrage automatique, mise à l'échelle à 80 % de la vue,
  6 lumières directionnelles, caméra placée face à la plus grande surface.
- Ajoute un bouton pour ouvrir le fichier avec l'application par défaut.

### FCStd / FCStd1 (FreeCAD)
Le fichier FreeCAD n'est pas rendu directement : la propriété cherche le
**GLB exporté associé**, dans cet ordre :
1. `<même dossier>/<stem>.glb` (ex. `3D/EOLI.FCStd` → `3D/EOLI.glb`)
2. `<même dossier>/<stem>.gltf`
3. `<même dossier>/<Code>.glb` (métadonnée `Code` de la classe)
4. `<même dossier>/<nom du fichier>.glb`

Si un GLB est trouvé, il est rendu dans le viewer et le bouton ouvre le
`.FCStd` dans FreeCAD. Sinon, un message d'erreur s'affiche (« Rendu 3D
introuvable. Ouvrir le fichier dans FreeCAD pour le créer. ») accompagné du
même bouton FreeCAD.

### Autres extensions
La propriété délègue à `MediaProperty` (comportement standard des médias).

## Contrat IApp

La propriété est agnostique de la plateforme. Deux méthodes ont été ajoutées à
l'interface `IApp` :

```ts
getResourceUrl(relativePath: string): string;         // URL chargeable (app:// sous Obsidian)
openExternal(relativePath: string): Promise<void>;     // ouverture avec l'app par défaut
```

L'implémentation Obsidian (`ObsidianApp` dans le plugin) utilise
`vault.adapter.getResourcePath()` pour la première et `electron.shell.openPath()`
pour la seconde. Un fallback `getAbsolutePath()` est utilisé si `getResourceUrl`
n'est pas disponible.

## Dépendances

- `three` (ajoutée aux dépendances de markdown-crm)
- Modules ESM `three/examples/jsm/...` : des stubs CJS sont fournis pour Jest
  (`__mocks__/three/`, câblés dans `jest.config.js` via `moduleNameMapper`)

## Tests

`__tests__/Properties/3DModelProperty.test.ts` — 17 tests couvrant :
- le type, l'héritage, les valeurs par défaut ;
- `getGlbCandidates` (génération des chemins candidats, doublons) ;
- le rendu embarqué GLB/GLTF (URL passée au loader) ;
- la résolution FCStd → GLB ;
- l'erreur + bouton FreeCAD quand aucun GLB n'est trouvé ;
- l'appel à `openExternal` au clic sur le bouton ;
- les fallbacks vers `MediaProperty` (fichier non 3D, valeur vide, lien cassé) ;
- l'absence de WebGL (erreur propre, pas de crash).
