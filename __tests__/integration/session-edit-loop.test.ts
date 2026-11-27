/**
 * @jest-environment jsdom
 *
 * SIMULATION DE SESSION : reproduit en pipeline réel (Vault + ConfigLoader +
 * DynamicClassFactory + ProcessManager + DisplayRenderer) une session
 * d'édition d'un fichier de classe "Action" :
 *
 *   - ouverture du fichier (onCreate → process de renommage)
 *   - boucle d'éditions de propriétés :
 *       · etat (SelectProperty, sans renommage)
 *       · animations[0].date (renommage à chaque édition via le process
 *         RenameFileAction "{animations[0].date} - Action - {current}")
 *       · changement de client (parents property "clients") → déplacement
 *         du fichier dans le dossier du nouveau parent par updateParentFolder
 *   - entre chaque édition : changement d'onglet simulé (getFromFile au
 *     chemin courant + getDisplay) comme le fait replaceMetadataContainer.
 *
 * INVARIANTS ATTENDUS (c'est ce qui gèle l'affichage du plugin quand ils
 * sont cassés : "au bout d'un moment, impossible de mettre à jour les
 * properties, il faut relancer Obsidian") :
 *
 *   I1. l'instance du panneau référence toujours un fichier qui existe
 *   I2. l'édition persiste dans le fichier réel (au chemin courant)
 *   I3. vault.files[key].getFile().path === key (contrat moveCachedClasse)
 *   I4. getFromFile(chemin courant) renvoie LA MÊME instance (pas de
 *       split-brain : deux instances pour un même fichier)
 *
 * Le test collecte chaque violation dans `problems` et échoue en listant
 * la première itération où la session a divergé.
 */

import { Vault } from '../../src/vault/Vault';
import { IApp, IFile, IFolder } from '../../src/interfaces/IApp';

jest.setTimeout(180000);

// ---------------------------------------------------------------------------
// Configs YAML (modèle réduit de Action.yaml : parent clients + process de
// renommage déclenché à chaque changement de propriété)
// ---------------------------------------------------------------------------
const ACTION_YAML = `
className: "Action"
parent:
  property: "clients"
  folder: "Actions"
properties:
  clients:
    type: "ObjectProperty"
    title: "Clients"
    properties:
      client:
        type: "FileProperty"
        classes: ["Institution"]
  animations:
    type: "ObjectProperty"
    title: "Animations"
    allowMove: false
    properties:
      date:
        type: "DateProperty"
      etat:
        type: "SelectProperty"
        options:
          - name: "Confirmée"
            color: "green"
          - name: "Réalisée"
            color: "purple"
  etat:
    type: "SelectProperty"
    options:
      - name: "Piste"
        color: "gray"
      - name: "Réflexion"
        color: "blue"
      - name: "Devis envoyé"
        color: "orange"
  date:
    type: "RangeDateProperty"
    derivedFrom: "animations.date"
  montant:
    type: "FormulaProperty"
    static: true
    formula: "return (clients ? clients.length : 0) + ' €'"
process:
  - name: UpdateNameFromClients
    description: Renomme le fichier à partir de la première animation
    triggers:
      - onCreate
      - onUpdate
      - onPropertyChange
    conditions:
      - property: animations
        type: isNotEmpty
    actions:
      - type: RenameFileAction
        template: "{animations[0].date} - Action - {current}"
display:
  items:
    - type: line
      items:
        - type: property
          name: classe
        - type: property
          name: etat
        - type: property
          name: date
        - type: property
          name: montant
`;

const INSTITUTION_YAML = `
className: "Institution"
properties:
  nom:
    type: "TextProperty"
`;

// ---------------------------------------------------------------------------
// Mock d'app, fidèle aux comportements qui comptent :
//   - updateMetadata / move sur un chemin inexistant → throw (comme
//     App.ts du plugin : "File not found")
//   - move ne mute PAS l'IFile passé (le plugin crée un nouvel objet)
//   - getFile : match exact de chemin (pas de fallback par nom)
//   - getMetadata : {} pour un fichier sans frontmatter (jamais null)
// ---------------------------------------------------------------------------
class SimApp implements IApp {
    files = new Map<string, IFile>();
    metadata = new Map<string, Record<string, any>>();
    contents = new Map<string, string>();
    notices: string[] = [];

    getSettings(): any {
        return {
            classePropertyName: 'classe',
            classePropertyAliases: [],
            deleteAliasesAfterMigration: true,
            tooltipType: 'title',
            phoneFormat: 'FR',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '24h',
            numberLocale: 'fr-FR',
            currencySymbol: '€',
        };
    }
    async readFile(file: IFile): Promise<string> {
        return this.contents.get(file.path) || '---\n---\n';
    }
    async writeFile(file: IFile, content: string): Promise<void> {
        this.contents.set(file.path, content);
        const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
        if (match) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const yaml = require('js-yaml');
            this.metadata.set(file.path, yaml.load(match[1]) || {});
        }
    }
    async createFile(path: string, content: string): Promise<IFile> {
        const file = this.makeIFile(path);
        this.files.set(path, file);
        await this.writeFile(file, content);
        return file;
    }
    async delete(file: IFile | IFolder): Promise<void> {
        this.files.delete(file.path);
        this.metadata.delete(file.path);
        this.contents.delete(file.path);
    }
    async move(fileOrFolder: IFile | IFolder, newPath: string): Promise<void> {
        const oldPath = fileOrFolder.path;
        if (!this.files.has(oldPath)) {
            throw new Error(`File not found: ${oldPath}`);
        }
        const meta = this.metadata.get(oldPath);
        const content = this.contents.get(oldPath);
        this.files.delete(oldPath);
        this.metadata.delete(oldPath);
        this.contents.delete(oldPath);
        this.files.set(newPath, this.makeIFile(newPath));
        if (meta) this.metadata.set(newPath, meta);
        if (content) this.contents.set(newPath, content);
    }
    async createFolder(path: string): Promise<IFolder> {
        return { path, name: path.split('/').pop() || path, children: [] };
    }
    async listFiles(folder?: IFolder): Promise<IFile[]> {
        return Array.from(this.files.values())
            .filter(f => !folder || f.path.startsWith(folder.path));
    }
    async listFolders(folder?: IFolder): Promise<IFolder[]> {
        return [];
    }
    async getFile(path: string): Promise<IFile | IFolder | null> {
        // Match exact — pas de fallback par nom (on veut voir les désyncs)
        return this.files.has(path) ? this.makeIFile(path) : null;
    }
    getAbsolutePath(relativePath: string): string {
        return `/vault/${relativePath}`;
    }
    getName(): string {
        return 'SimVault';
    }
    isFolder(file: IFile): boolean {
        return !('extension' in (file as any));
    }
    isFile(file: IFile): boolean {
        return 'extension' in (file as any);
    }
    getUrl(path: string): string {
        return `vault://sim/${path}`;
    }
    async getMetadata(file: IFile): Promise<Record<string, any>> {
        return this.metadata.get(file.path) || {};
    }
    async updateMetadata(file: IFile, metadata: Record<string, any>): Promise<void> {
        if (!this.files.has(file.path)) {
            throw new Error(`File not found: ${file.path}`);
        }
        this.metadata.set(file.path, { ...metadata });
    }
    createButton(text: string, onClick: () => void): HTMLButtonElement {
        const b = document.createElement('button');
        b.textContent = text;
        b.onclick = onClick;
        return b;
    }
    createInput(type: string, value?: string): HTMLInputElement {
        const i = document.createElement('input');
        i.type = type;
        if (value !== undefined) i.value = value;
        return i;
    }
    createDiv(className?: string): HTMLDivElement {
        const d = document.createElement('div');
        if (className) d.className = className;
        return d;
    }
    setIcon(element: HTMLElement, iconName: string): void {
        element.setAttribute('data-icon', iconName);
    }
    async getTemplateContent(templateName: string): Promise<string> {
        return '';
    }
    getSetting(key: string): any {
        return (this.getSettings() as any)[key];
    }
    async setSetting(key: string, value: any): Promise<void> {}
    getVaultPath(): string {
        return '/vault';
    }
    open(absoluteMediaPath: string, newTab?: boolean): void {}
    async waitForFileMetaDataUpdate(filePath: string, key: string, callback: () => Promise<void>): Promise<void> {
        await callback();
    }
    async waitForMetaDataCacheUpdate(callback: () => Promise<void>): Promise<void> {
        await callback();
    }
    async selectMedia(vault: any, message: string): Promise<any> {
        return null;
    }
    async selectMultipleFile(vault: any, classes: string[], options: any): Promise<any> {
        return [];
    }
    async selectFile(vault: any, classes: string[], options: any): Promise<any> {
        return null;
    }
    async selectClasse(vault: any, classes: string[], options: any): Promise<any> {
        return null;
    }
    async selectFromList<T>(items: T[], options: { multiple: boolean; title?: string }): Promise<T | T[] | null> {
        return null;
    }
    sendNotice(message: string, timeout?: number): void {
        this.notices.push(message);
    }
    needDisplayRefresh(): void {}
    getCurrentFile(): IFile | null {
        return null;
    }
    private makeIFile(path: string): IFile {
        const name = path.split('/').pop() || path;
        return {
            path,
            name,
            basename: name.replace(/\.md$/, '').replace(/\.yaml$/, ''),
            extension: name.includes('.') ? name.split('.').pop()! : '',
            parent: undefined,
            children: [],
        };
    }
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('Simulation de session : édition + renommage + déplacements de parent', () => {
    it("la session reste saine (invariants I1 à I4) sur 12 itérations d'édition", async () => {
        const app = new SimApp();

        await app.createFile('config/Action.yaml', ACTION_YAML);
        await app.createFile('config/Institution.yaml', INSTITUTION_YAML);
        await app.createFile('Institutions/Demo/Demo.md',
            '---\nclasse: "Institution"\nnom: "Demo"\n---\n');
        await app.createFile('Institutions/Demo2/Demo2.md',
            '---\nclasse: "Institution"\nnom: "Demo2"\n---\n');
        await app.createFile('Institutions/Demo/Actions/Initiales.md',
            '---\n' +
            'classe: "Action"\n' +
            'clients:\n  - client: "[[Institutions/Demo/Demo|Demo]]"\n' +
            'animations:\n  - date: "2025-01-10"\n    etat: "Confirmée"\n' +
            'etat: "Piste"\n' +
            '---\n');

        const vault = new Vault(app as any, {
            templateFolder: 'templates',
            personalName: 'Test',
            configPath: 'config',
        } as any);

        const problems: string[] = [];
        const ETATS = ['Réflexion', 'Devis envoyé', 'Piste'];

        // ---- Ouverture du fichier (comme le panneau du plugin) ----
        const opened = await app.getFile('Institutions/Demo/Actions/Initiales.md');
        let panel = await vault.getFromFile(opened as IFile);
        expect(panel).toBeDefined();
        // onCreate a déjà pu renommer le fichier
        let currentPath = panel!.getFile()!.getPath();

        const checkInvariants = (label: string) => {
            // I1 : le fichier référencé par l'instance existe
            if (!app.files.has(currentPath)) {
                problems.push(`${label} I1: le panneau référence un chemin inexistant "${currentPath}"`);
            }
            // I3 : le cache vault.files reste synchronisé avec les instances
            for (const [key, inst] of Object.entries((vault as any).files || {})) {
                if (!inst) continue;
                const p = (inst as any).getFile()?.getPath();
                if (p !== key) {
                    problems.push(`${label} I3: cache vault.files["${key}"] → instance à "${p}"`);
                }
            }
            // Doublons d'instances pour un même chemin réel
            const byPath = new Map<string, number>();
            for (const [, inst] of Object.entries((vault as any).files || {})) {
                if (!inst) continue;
                const p = (inst as any).getFile()?.getPath();
                byPath.set(p, (byPath.get(p) || 0) + 1);
            }
            for (const [p, n] of byPath) {
                if (n > 1) {
                    problems.push(`${label} I4: ${n} instances en cache pour le même fichier "${p}"`);
                }
            }
        };

        checkInvariants('ouverture');
        await panel!.getDisplay(); // rendu initial
        checkInvariants('rendu initial');

        // ---- Boucle de session ----
        for (let i = 0; i < 12; i++) {
            const t0 = Date.now();

            // 1. Édition d'une propriété simple (sans renommage)
            try {
                await panel!.updatePropertyValue('etat', ETATS[i % ETATS.length]);
                const v = (await app.getMetadata({ path: currentPath } as IFile))['etat'];
                if (v !== ETATS[i % ETATS.length]) {
                    problems.push(`itération ${i} I2: etat non persisté (fichier="${v}")`);
                }
            } catch (e: any) {
                problems.push(`itération ${i} I2: l'édition de etat a échoué : ${e?.message}`);
            }

            // 2. Changement de client aux itérations 5 et 9 → updateParentFolder
            //    déplace le fichier dans le dossier du parent
            if (i === 5 || i === 9) {
                const client = i === 5
                    ? '[[Institutions/Demo2/Demo2|Demo2]]'
                    : '[[Institutions/Demo/Demo|Demo]]';
                try {
                    await panel!.updatePropertyValue('clients', [{ client }]);
                } catch (e: any) {
                    problems.push(`itération ${i} I2: le changement de client a échoué : ${e?.message}`);
                }
            }

            // 3. Édition de la date d'animation → process RenameFileAction
            try {
                const anims = await panel!.getPropertyValue('animations');
                const newAnims = JSON.parse(JSON.stringify(anims || [{}]));
                newAnims[0].date = `2025-01-${String(11 + i).padStart(2, '0')}`;
                await panel!.updatePropertyValue('animations', newAnims);
                const stored = await app.getMetadata({ path: panel!.getFile()!.getPath() } as IFile);
                if (!stored.animations?.[0]?.date?.startsWith(`2025-01-${String(11 + i).padStart(2, '0')}`)) {
                    problems.push(`itération ${i} I2: animations non persisté`);
                }
            } catch (e: any) {
                problems.push(`itération ${i} I2: l'édition de animations a échoué : ${e?.message}`);
            }

            currentPath = panel!.getFile()!.getPath();

            // 4. Changement d'onglet simulé : re-résolution au chemin courant
            const refiled = await app.getFile(currentPath);
            if (!refiled) {
                problems.push(`itération ${i} I1: le chemin courant "${currentPath}" n'existe pas après les éditions`);
            } else {
                const again = await vault.getFromFile(refiled as IFile);
                if (again !== panel) {
                    problems.push(
                        `itération ${i} I4: getFromFile("${currentPath}") a créé une SECONDE instance (split-brain)`
                    );
                    panel = again; // le panneau du plugin afficherait désormais celle-ci
                }
            }

            // 5. Re-rendu (comme replaceMetadataContainer)
            try {
                await panel!.getDisplay();
            } catch (e: any) {
                problems.push(`itération ${i}: getDisplay a échoué : ${e?.message}`);
            }

            checkInvariants(`itération ${i}`);
            // eslint-disable-next-line no-console
            console.log(`itération ${i} : ${Date.now() - t0} ms, chemin courant = ${currentPath}`);
        }

        // Résultat de la simulation : liste de toutes les divergences
        // eslint-disable-next-line no-console
        console.log('PROBLEMES:', JSON.stringify(problems, null, 2));
        expect(problems).toEqual([]);
    });
});
