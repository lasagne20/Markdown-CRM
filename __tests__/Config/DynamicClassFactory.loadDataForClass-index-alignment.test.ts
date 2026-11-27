/**
 * @jest-environment jsdom
 *
 * Bug 6 (Tier 1) : DynamicClassFactory.loadDataForClass faisait
 * `const instance = instances[i]` dans la seconde passe (liaison des
 * parents), en supposant que `instances` restait parallèle à `data`.
 * Or createInstanceFromData retourne null pour un item sans nom (entrée
 * JSON malformée) et l'item n'est PAS poussé : tout se décale et le lien
 * parent est écrit sur le MAUVAIS fichier.
 *
 * Scénario : data = [ {entrée sans nom}, Enfant(parent: ParentVille),
 * ParentVille ].
 *   - comportement actuel (bug) : Enfant ne reçoit aucun parent, et
 *     ParentVille reçoit un lien parent pointant sur LUI-MÊME ;
 *   - comportement attendu : Enfant reçoit parent=ParentVille,
 *     ParentVille n'a pas de parent.
 */

import { DynamicClassFactory } from '../../src/Config/DynamicClassFactory';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { IApp, IFile } from '../../src/interfaces/IApp';

class TestItem extends Classe {}

class MemApp implements IApp {
    files = new Map<string, IFile>();
    meta = new Map<string, Record<string, any>>();

    getSettings(): any { return { classePropertyName: 'Classe' }; }
    async getFile(path: string): Promise<IFile | null> {
        return this.files.has(path)
            ? { path, name: path.split('/').pop()!, basename: path.split('/').pop()!.replace(/\.md$/, ''), extension: 'md', children: [] } as IFile
            : null;
    }
    async createFile(path: string): Promise<IFile> {
        const file: IFile = { path, name: path.split('/').pop()!, basename: path.split('/').pop()!.replace(/\.md$/, ''), extension: 'md', children: [] };
        this.files.set(path, file);
        this.meta.set(path, {});
        return file;
    }
    async getMetadata(file: any): Promise<Record<string, any>> {
        return this.meta.get(file.path) || {};
    }
    async updateMetadata(file: any, metadata: Record<string, any>): Promise<void> {
        this.meta.set(file.path, { ...metadata });
    }
    async readFile(file: IFile): Promise<string> { return ''; }
    async writeFile(file: IFile, content: string): Promise<void> {}
    async delete(file: IFile): Promise<void> {}
    async move(fileOrFolder: IFile, newPath: string): Promise<void> {}
    async createFolder(path: string): Promise<any> { return { path, name: path, children: [] }; }
    async listFiles(): Promise<IFile[]> { return Array.from(this.files.values()); }
    async listFolders(): Promise<any[]> { return []; }
    getAbsolutePath(p: string): string { return p; }
    getName(): string { return 'MemVault'; }
    isFolder(file: IFile): boolean { return !('extension' in (file as any)); }
    isFile(file: IFile): boolean { return 'extension' in (file as any); }
    getUrl(path: string): string { return path; }
    createButton(): HTMLButtonElement { return document.createElement('button'); }
    createInput(): HTMLInputElement { return document.createElement('input'); }
    createDiv(className?: string): HTMLDivElement {
        const d = document.createElement('div');
        if (className) d.className = className;
        return d;
    }
    setIcon(): void {}
    async getTemplateContent(): Promise<string> { return ''; }
    getSetting(key: string): any { return (this.getSettings() as any)[key]; }
    async setSetting(): Promise<void> {}
    getVaultPath(): string { return '/mem'; }
    open(): void {}
    async waitForFileMetaDataUpdate(_p: string, _k: string, callback: () => Promise<void>): Promise<void> { await callback(); }
    async waitForMetaDataCacheUpdate(callback: () => Promise<void>): Promise<void> { await callback(); }
    async selectMedia(): Promise<any> { return null; }
    async selectMultipleFile(): Promise<any> { return []; }
    async selectFile(): Promise<any> { return null; }
    async selectClasse(): Promise<any> { return null; }
    async selectFromList(): Promise<any> { return null; }
    sendNotice(): void {}
    needDisplayRefresh(): void {}
    getCurrentFile(): IFile | null { return null; }
}

describe('loadDataForClass - alignement instances/data (liaison des parents)', () => {
    it('un item sans nom ne doit pas décaler la liaison des parents', async () => {
        const app = new MemApp();
        const vault = new Vault(app as any, { configPath: 'config' } as any);
        const factory = new DynamicClassFactory('config', vault);

        // Stub de la résolution de classe et des données
        (factory as any).getClass = jest.fn().mockResolvedValue(TestItem);
        const config = { parent: { property: 'lieu', folder: 'TestItems' }, properties: {} };
        jest.spyOn((factory as any).configManager, 'loadClassData')
            .mockResolvedValue([
                { type: 'entrée malformée sans nom' },
                { nom: 'Enfant', parent: 'ParentVille' },
                { nom: 'ParentVille' },
            ]);
        jest.spyOn((factory as any).configManager, 'getClassConfig')
            .mockResolvedValue(config);

        await factory.loadDataForClass('TestItem', vault, false);

        const enfantMeta = app.meta.get('TestItems/Enfant/Enfant.md');
        const parentMeta = app.meta.get('TestItems/ParentVille/ParentVille.md');

        // Le parent est écrit sur le BON fichier (l'enfant)…
        expect(enfantMeta?.['lieu']).toBe('[[TestItems/ParentVille/ParentVille.md]]');
        // …et PAS sur le mauvais (ParentVille ne doit pas se référencer lui-même)
        expect(parentMeta?.['lieu']).toBeUndefined();
    });
});
