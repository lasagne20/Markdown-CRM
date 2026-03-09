/**
 * @jest-environment jsdom
 *
 * Integration test: updatePropertyValue → updateMetadata → updateParentFolder
 *
 * ROOT CAUSE:
 *   updatePropertyValue() does:
 *     const metadata = await this.getMetadata();  // gets cache object reference
 *     metadata['postes'] = newValue;              // MUTATES the same object
 *     await this.updateMetadata(metadata);         // passes mutated object
 *
 *   Inside updateMetadata():
 *     const oldMetadata = await this.getMetadata();  // returns THE SAME mutated object!
 *     // oldMetadata['postes'] === metadata['postes'] === newValue
 *     // → "unchanged, skipping folder update"
 */

import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { FileProperty } from '../../src/properties/FileProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { File } from '../../src/vault/File';

// ---------------------------------------------------------------------------
// Minimal Classe subclass with parent configured on "postes"
// ---------------------------------------------------------------------------
class Personne extends Classe {
    static parentPropertyName = 'postes';
    async onCreate() {}
    async onUpdate() {}
    async onDelete() {}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeIFile(path: string) {
    const parts = path.split('/');
    const name = parts[parts.length - 1];
    const basename = name.replace(/\.md$/, '');
    const parent = { path: parts.slice(0, -1).join('/') };
    return { path, name, basename, extension: 'md', parent };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('Classe.updatePropertyValue → parentFolder integration (stale-reference bug)', () => {
    let vault: jest.Mocked<Vault>;
    let mockApp: any;

    // Metadata "database" — simulates the file-system store
    let metadataStore: Record<string, any>;

    // The two institutions
    const instAPath = 'OCC/InstA/InstA.md';
    const instBPath = 'OCC/InstB/InstB.md';
    const personPath = 'OCC/InstA/Pers/Martin.md';

    // The IFile objects
    const iInstA = makeIFile(instAPath);
    const iInstB = makeIFile(instBPath);
    const iPerson = makeIFile(personPath);

    beforeEach(() => {
        jest.clearAllMocks();

        // Initial metadata: Martin works at InstA
        metadataStore = {
            [personPath]: {
                classe: 'Personne',
                nom: 'Martin',
                postes: [{ institution: `[[${instAPath}|InstA]]`, poste: 'Dev' }],
            },
        };

        mockApp = {
            getMetadata: jest.fn((ifile: any) => {
                // Always read from store — simulates what Obsidian does AFTER cache refresh
                // NOTE: to reproduce the bug we intentionally return a mutable object
                return Promise.resolve(metadataStore[ifile.path] ?? null);
            }),
            updateMetadata: jest.fn((ifile: any, data: any) => {
                // Persist to store (simulates Obsidian writing frontmatter)
                metadataStore[ifile.path] = data;
                return Promise.resolve();
            }),
            move: jest.fn().mockResolvedValue(undefined),
            createFolder: jest.fn().mockResolvedValue(undefined),
            getFile: jest.fn().mockResolvedValue(null),
            isFolder: jest.fn().mockReturnValue(false),
            listFiles: jest.fn().mockResolvedValue([]),
            getSettings: jest.fn().mockReturnValue({ classePropertyName: 'classe' }),
            setIcon: jest.fn(),
            createDiv: jest.fn((c?: string) => {
                const d = document.createElement('div');
                if (c) d.className = c;
                return d;
            }),
        };

        vault = {
            app: mockApp,
            getFromLink: jest.fn(),
            files: {},
            listFiles: jest.fn().mockResolvedValue([]),
        } as any;
    });

    it('FAILS (bug): file is NOT moved when postes institution changes via updatePropertyValue', async () => {
        // ── Build the Personne instance ──────────────────────────────────────
        const person = new Personne(vault, iPerson as any);

        const institutionProp = new FileProperty('institution', vault, ['Institution'], {});
        const posteProp       = new TextProperty('poste', vault, {});
        const postesProp      = new ObjectProperty('postes', vault, {
            institution: institutionProp,
            poste: posteProp,
        }, {});

        // When the new postes value points to InstB, getParentFile → InstB
        jest.spyOn(institutionProp, 'getParentFile').mockResolvedValue(
            new File(vault, iInstB as any)
        );

        person.addProperty(postesProp);

        // ── Simulate the user picking InstB in the UI ────────────────────────
        const newPostes = [{ institution: `[[${instBPath}|InstB]]`, poste: 'Dev' }];

        // This is the real entry point: ObjectProperty callback calls this
        await person.updatePropertyValue('postes', newPostes);

        // ── Assert the file moved ────────────────────────────────────────────
        // After the fix, move() must be called because the institution changed.
        // Before the fix, it isn't because oldMetadata.postes === newMetadata.postes
        // (same mutated object reference).
        expect(mockApp.move).toHaveBeenCalled();
    });
});
