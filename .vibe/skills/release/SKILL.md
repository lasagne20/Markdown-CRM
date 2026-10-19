---
name: release
description: >-
  Publie une nouvelle version du plugin obsidian-CRM : bump de version, changelog, build, commit, tag, push GitHub et création de la release avec assets (pour BRAT).
---

# release

Processus complet de publication d'une version du plugin **obsidian-CRM** (repo GitHub : `lasagne20/obsidian-CRM`).

Dossier du plugin :
```
C:\Users\leodu\Documents\1 - Pro\Test plugin obsidian\.obsidian\plugins\obsidian-CRM
```

## Prérequis

- Tout le code à publier est **commité** dans le plugin (git status propre sur les sources)
- La lib `markdown-crm` est déjà à jour dans `node_modules` (voir skill `start`) et le build passe : `npm run build`
- Connaître la version cible (ex. 1.0.4 → 1.0.5) et le contenu du changelog

## Étapes

### 1. Bump de version

```bash
cd "C:\Users\leodu\Documents\1 - Pro\Test plugin obsidian\.obsidian\plugins\obsidian-CRM"
npm version <X.Y.Z> --no-git-tag-version
npm run version   # met à jour manifest.json + versions.json via version-bump.mjs
```

Vérifier : `grep version manifest.json` et `cat versions.json`.

### 2. Changelog

Ajouter la section au début de `CHANGELOG.md` (format Keep a Changelog, date du jour) :

```markdown
## [<X.Y.Z>] - <AAAA-MM-JJ>

### ✨ Added / 🐛 Fixed
- ...
```

### 3. Build et dossier release/

```bash
npm run build
cp main.js release/main.js
cp manifest.json release/manifest.json
cp CHANGELOG.md release/CHANGELOG.md
```

(`release/styles.css` : le copier seulement si le CSS a changé)

### 4. Commit et tag

```bash
git add -A
git commit -m "<type>: <résumé> (v<X.Y.Z>)"
git tag -a v<X.Y.Z> -m "v<X.Y.Z>: <résumé>"
```

### 5. Push (demander l'autorisation utilisateur)

```bash
git push origin main --follow-tags
```

Ne pas pousser sur le remote `serveur` (Synology) sans demande explicite.

### 6. Créer la release GitHub (avec assets pour BRAT)

⚠️ **Un tag seul est invisible pour BRAT** : la release GitHub avec ses assets est indispensable pour que BRAT propose la mise à jour.

Pas de `gh` CLI sur cette machine. Utiliser l'API GitHub via Python avec le token du credential helper git. Créer un script temporaire `tmp_create_release.py` dans le dossier du plugin :

```python
import json, os, re, sys, urllib.request

if len(sys.argv) < 2:
    sys.exit("Usage: python tmp_create_release.py <X.Y.Z>")
version = sys.argv[1]
token = os.environ['GH_TOKEN']
repo = 'lasagne20/obsidian-CRM'

# Extraire la section du changelog
with open('CHANGELOG.md', encoding='utf-8') as f:
    content = f.read()
m = re.search(rf'(## \[{re.escape(version)}\].*?)(?=\n## \[)', content, re.DOTALL)
body = m.group(1).strip() if m else version

payload = {
    'tag_name': f'v{version}',
    'name': f'v{version}',
    'body': body,
    'draft': False,
    'prerelease': False
}

req = urllib.request.Request(
    f'https://api.github.com/repos/{repo}/releases',
    data=json.dumps(payload).encode(),
    headers={
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
    },
    method='POST'
)
with urllib.request.urlopen(req) as r:
    release = json.loads(r.read())
release_id = release['id']
print(f"Release creee: {release['html_url']}")

for fname in ['main.js', 'manifest.json', 'styles.css']:
    with open(fname, 'rb') as f:
        data = f.read()
    req = urllib.request.Request(
        f'https://uploads.github.com/repos/{repo}/releases/{release_id}/assets?name={fname}',
        data=data,
        headers={
            'Authorization': f'token {token}',
            'Content-Type': 'application/octet-stream'
        },
        method='POST'
    )
    with urllib.request.urlopen(req) as r:
        asset = json.loads(r.read())
    print(f"Asset uploade: {asset['name']} ({asset['size']} bytes)")
```

Puis l'exécuter et le supprimer :

```bash
export GH_TOKEN=$(printf "protocol=https\nhost=github.com\n" | git credential fill 2>/dev/null | grep "^password=" | cut -d= -f2)
python tmp_create_release.py <X.Y.Z>
rm -f tmp_create_release.py
```

Note : l'extraction du token et l'appel API déclenchent la confirmation utilisateur du mécanisme d'approbation — c'est normal, relancer.

### 7. Vérification

- La release apparaît sur https://github.com/lasagne20/obsidian-CRM/releases avec les 3 assets (main.js, manifest.json, styles.css)
- Optionnel : zip de distribution dans `github-release/obsidian-crm-v<X.Y.Z>.zip` (PowerShell Compress-Archive de release/main.js, manifest.json, styles.css, CHANGELOG.md)
- Côté utilisateur : dans le vault avec BRAT, lancer **"BRAT: Check for updates to all beta plugins"**

## Points d'attention

- BRAT compare la version de la release GitHub avec celle du manifest installé → la release doit exister et sa version doit être strictement supérieure
- Dans le vault de dev, le plugin est le dossier source lui-même : BRAT n'y propose jamais de mise à jour (déjà à jour par définition)
- `npm run version` fait aussi `git add manifest.json versions.json` : le commit de l'étape 4 inclut ces fichiers
- Si l'API échoue avec 422, vérifier qu'une release n'existe pas déjà pour ce tag (l'étape 6 ne crée pas les doublons mais le script ne gère pas l'idempotence)
