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

    // The IFile objects — declared as let so beforeEach can create fresh copies.
    // IMPORTANT: File.move() mutates ifile.path (it's stored by reference), so each
    // test needs its own pristine IFile object to avoid cross-test state pollution.
    let iInstA: ReturnType<typeof makeIFile>;
    let iInstB: ReturnType<typeof makeIFile>;
    let iPerson: ReturnType<typeof makeIFile>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Fresh IFile objects for each test (avoid path-mutation bleed from File.move)
        iInstA  = makeIFile(instAPath);
        iInstB  = makeIFile(instBPath);
        iPerson = makeIFile(personPath);

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

    it('FAILS (bug 2): file moves to OLD institution when postes changes (stale getParentFile)', async () => {
        // The stale-reference fix made us detect the change, but updateParentFolder
        // then calls this.getParentFile() which re-reads the Obsidian cache.
        // The cache still has the OLD value → parentFile = InstA → martin moves to InstA's folder.
        //
        // Fix: keep the parentFile already resolved from newValue inside the validation
        // block and use it instead of calling this.getParentFile() again.

        const person = new Personne(vault, iPerson as any);

        const institutionProp = new FileProperty('institution', vault, ['Institution'], {});
        const posteProp       = new TextProperty('poste', vault, {});
        const postesProp      = new ObjectProperty('postes', vault, {
            institution: institutionProp,
            poste: posteProp,
        }, {});

        // Returns the correct File based on which institution link is passed.
        // This is essential: when the stale cache supplies the OLD InstA link,
        // getParentFile must return InstA's file so we can verify the fix routes
        // to InstB (the new parent) rather than the stale InstA.
        jest.spyOn(institutionProp, 'getParentFile').mockImplementation(async (link: any) => {
            const s = typeof link === 'string' ? link : JSON.stringify(link ?? '');
            if (s.includes('InstA')) return new File(vault, iInstA as any);
            if (s.includes('InstB')) return new File(vault, iInstB as any);
            return undefined;
        });

        person.addProperty(postesProp);

        // Simulate stale cache: getMetadata still returns OLD postes (InstA) after write
        // This mimics Obsidian not having refreshed the cache yet
        mockApp.getMetadata.mockImplementation((ifile: any) => {
            if (ifile.path === personPath) {
                // Always return the OLD value — cache not refreshed
                return Promise.resolve({
                    classe: 'Personne',
                    nom: 'Martin',
                    postes: [{ institution: `[[${instAPath}|InstA]]`, poste: 'Dev' }],
                });
            }
            return Promise.resolve(metadataStore[ifile.path] ?? null);
        });

        const newPostes = [{ institution: `[[${instBPath}|InstB]]`, poste: 'Dev' }];
        await person.updatePropertyValue('postes', newPostes);

        // ✅ move must have been called
        expect(mockApp.move).toHaveBeenCalled();

        // ✅ must move to InstB's folder, NOT InstA's
        const moveCalls = mockApp.move.mock.calls;
        expect(moveCalls.length).toBeGreaterThan(0);
        const movedToPath: string = moveCalls[0][1]; // second arg is target path
        expect(movedToPath).toContain('InstB');
        expect(movedToPath).not.toContain('InstA');
    });
});
