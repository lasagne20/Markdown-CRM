/**
 * @jest-environment jsdom
 *
 * Tests for ThreeDModelProperty :
 * - rendu 3D embarque (glb/gltf) avec three.js
 * - resolution FCStd -> GLB associe
 * - ouverture du fichier source (FreeCAD) via IApp.openExternal
 * - fallback vers MediaProperty pour les fichiers non 3D
 */

import { ThreeDModelProperty, getGlbCandidates } from '../../src/properties/3DModelProperty';
import { MediaProperty } from '../../src/properties/MediaProperty';

// Mock three.js (WebGL indisponible dans jsdom)
jest.mock('three', () => ({
    __esModule: true,
    Scene: jest.fn().mockImplementation(() => ({ add: jest.fn() })),
    PerspectiveCamera: jest.fn().mockImplementation(() => ({
        position: { set: jest.fn(), x: 0, y: 10, z: 0 },
        up: { set: jest.fn() },
        lookAt: jest.fn(),
        fov: 75
    })),
    WebGLRenderer: jest.fn().mockImplementation(() => ({
        setSize: jest.fn(),
        domElement: document.createElement('canvas'),
        render: jest.fn()
    })),
    DirectionalLight: jest.fn().mockImplementation(() => ({
        position: { set: jest.fn(), x: 0, y: 0, z: 0 },
        target: { position: { set: jest.fn() } }
    })),
    AmbientLight: jest.fn().mockImplementation(() => ({ })),
    Box3: jest.fn().mockImplementation(() => ({
        setFromObject: jest.fn().mockReturnThis(),
        getCenter: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
        getSize: jest.fn().mockReturnValue({ x: 1, y: 1, z: 1 })
    })),
    Vector3: jest.fn().mockImplementation(() => ({ sub: jest.fn() }))
}));

jest.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
    __esModule: true,
    GLTFLoader: jest.fn().mockImplementation(() => ({ load: jest.fn() }))
}));

jest.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
    __esModule: true,
    OrbitControls: jest.fn().mockImplementation(() => ({
        enableDamping: false,
        dampingFactor: 0,
        enableZoom: false,
        enablePan: false,
        enableRotate: false,
        minPolarAngle: 0,
        maxPolarAngle: Math.PI,
        target: { set: jest.fn() },
        update: jest.fn()
    }))
}));

// Attente des microtasks/timers pour le peuplement asynchrone du conteneur
async function flushAsync(): Promise<void> {
    for (let i = 0; i < 5; i++) {
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
}

describe('ThreeDModelProperty', () => {
    let property: ThreeDModelProperty;
    let mockVault: any;
    let mockApp: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockApp = {
            getFile: jest.fn().mockResolvedValue(null),
            getAbsolutePath: jest.fn().mockImplementation((p: string) => `/vault/${p}`),
            getResourceUrl: jest.fn().mockImplementation((p: string) => `app://local/vault/${p}`),
            openExternal: jest.fn().mockResolvedValue(undefined),
            setIcon: jest.fn()
        };

        mockVault = {
            app: mockApp,
            readLinkFile: jest.fn().mockImplementation((link: string, path = false) => {
                if (!link) return '';
                return link.replace('[[', '').replace(']]', '').split('|')[0].trim();
            }),
            getMediaFromLink: jest.fn().mockResolvedValue(null)
        };

        property = new ThreeDModelProperty('Modele3D', mockVault);
    });

    describe('Constructor', () => {
        it('devrait avoir le type 3dmodel', () => {
            expect(property.type).toBe('3dmodel');
        });

        it('devrait heriter de MediaProperty', () => {
            expect(property).toBeInstanceOf(MediaProperty);
        });

        it('devrait avoir l icone box par defaut', () => {
            expect(property.icon).toBe('box');
        });

        it('devrait permettre un libelle d ouverture personnalise', () => {
            const custom = new ThreeDModelProperty('Modele3D', mockVault, { openLabel: 'Ouvrir FreeCAD' });
            expect((custom as any).openLabel).toBe('Ouvrir FreeCAD');
        });
    });

    describe('getGlbCandidates', () => {
        it('devrait generer glb et gltf a partir du stem du fichier', () => {
            expect(getGlbCandidates('Familles/F-EOLI/EOLI.FCStd')).toEqual([
                'Familles/F-EOLI/EOLI.glb',
                'Familles/F-EOLI/EOLI.gltf'
            ]);
        });

        it('devrait gerer un chemin sans dossier', () => {
            expect(getGlbCandidates('model.FCStd')).toEqual(['model.glb', 'model.gltf']);
        });

        it('devrait ajouter les noms supplementaires (Code, nom de fichier)', () => {
            const candidates = getGlbCandidates('3D/SOCLE.FCStd', ['EOLI-SOCLE', 'Socle de l eolienne']);
            expect(candidates).toContain('3D/EOLI-SOCLE.glb');
            expect(candidates).toContain('3D/Socle de l eolienne.glb');
        });

        it('ne devrait pas produire de doublons', () => {
            const candidates = getGlbCandidates('3D/EOLI.FCStd', ['EOLI']);
            expect(candidates.filter((c) => c === '3D/EOLI.glb').length).toBe(1);
        });
    });

    describe('fillDisplay - fichiers 3D', () => {
        it('devrait embarquer un rendu 3D pour un glb existant', async () => {
            mockApp.getFile.mockImplementation((p: string) =>
                Promise.resolve(p === '3D/model.glb' ? { path: p, name: 'model.glb' } : null
            ));

            const container = property.fillDisplay('[[3D/model.glb]]', jest.fn());
            expect(container).toBeInstanceOf(HTMLDivElement);
            expect(container.classList.contains('embed-container')).toBe(true);

            await flushAsync();

            const canvas = container.querySelector('canvas.embed-media');
            expect(canvas).toBeTruthy();

            const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');
            const loaderInstance = (GLTFLoader as jest.Mock).mock.results[0]?.value;
            expect(loaderInstance.load).toHaveBeenCalledWith(
                'app://local/vault/3D/model.glb',
                expect.any(Function),
                undefined,
                expect.any(Function)
            );
        });

        it('devrait ajouter un bouton d ouverture externe sur le rendu', async () => {
            mockApp.getFile.mockResolvedValue({ path: '3D/model.glb' });

            const container = property.fillDisplay('[[3D/model.glb]]', jest.fn());
            await flushAsync();

            const openButton = container.querySelector('button.open-external-button');
            expect(openButton).toBeTruthy();
            openButton!.dispatchEvent(new MouseEvent('click'));
            await flushAsync();
            expect(mockApp.openExternal).toHaveBeenCalledWith('3D/model.glb');
        });
    });

    describe('Boutons overlay du viewer', () => {
        it('devrait ajouter le bouton lien (changement de fichier) sur le rendu', async () => {
            mockApp.getFile.mockResolvedValue({ path: '3D/model.glb' });
            mockApp.selectMedia = jest.fn().mockResolvedValue({ path: '3D/other.glb', name: 'other.glb' });
            const update = jest.fn().mockResolvedValue(undefined);

            const container = property.fillDisplay('[[3D/model.glb]]', update);
            await flushAsync();

            const editOverlay = container.querySelector('.embed-edit-container') as HTMLElement;
            expect(editOverlay).toBeTruthy();
            editOverlay.querySelector('i')!.dispatchEvent(new MouseEvent('click'));
            await flushAsync();

            expect(mockApp.selectMedia).toHaveBeenCalledWith(mockVault, expect.any(String));
            expect(update).toHaveBeenCalledWith('[[3D/other.glb|other.glb]]');
        });

        it('ne devrait rien mettre a jour si la selection de media est annulee', async () => {
            mockApp.getFile.mockResolvedValue({ path: '3D/model.glb' });
            mockApp.selectMedia = jest.fn().mockResolvedValue(null);
            const update = jest.fn().mockResolvedValue(undefined);

            const container = property.fillDisplay('[[3D/model.glb]]', update);
            await flushAsync();

            const editOverlay = container.querySelector('.embed-edit-container') as HTMLElement;
            editOverlay.querySelector('i')!.dispatchEvent(new MouseEvent('click'));
            await flushAsync();

            expect(mockApp.selectMedia).toHaveBeenCalled();
            expect(update).not.toHaveBeenCalled();
        });

        it('devrait ajouter le bouton ouvrir (external-link) sur le rendu', async () => {
            mockApp.getFile.mockResolvedValue({ path: '3D/model.glb' });

            const container = property.fillDisplay('[[3D/model.glb]]', jest.fn());
            await flushAsync();

            const openOverlay = container.querySelector('.embed-open-container') as HTMLElement;
            expect(openOverlay).toBeTruthy();
            openOverlay.querySelector('i')!.dispatchEvent(new MouseEvent('click'));
            await flushAsync();
            expect(mockApp.openExternal).toHaveBeenCalledWith('3D/model.glb');
        });

        it('devrait ouvrir le FCStd (pas le glb) depuis le bouton ouvrir sur un rendu FCStd', async () => {
            mockApp.getFile.mockImplementation((p: string) =>
                Promise.resolve(p.endsWith('EOLI.glb') ? { path: p } : null)
            );
            mockVault.readLinkFile.mockReturnValue('3D/EOLI.FCStd');

            const container = property.fillDisplay('[[3D/EOLI.FCStd]]', jest.fn());
            await flushAsync();

            const openOverlay = container.querySelector('.embed-open-container') as HTMLElement;
            expect(openOverlay).toBeTruthy();
            openOverlay.querySelector('i')!.dispatchEvent(new MouseEvent('click'));
            await flushAsync();
            expect(mockApp.openExternal).toHaveBeenCalledWith('3D/EOLI.FCStd');
        });

        it('ne devrait pas ajouter les overlays en cas d erreur (pas de rendu)', async () => {
            mockVault.readLinkFile.mockReturnValue('3D/EOLI.FCStd');

            const container = property.fillDisplay('[[3D/EOLI.FCStd]]', jest.fn());
            await flushAsync();

            expect(container.querySelector('.embed-edit-container')).toBeFalsy();
            expect(container.querySelector('.embed-open-container')).toBeFalsy();
        });
    });

    describe('fillDisplay - FCStd', () => {
        it('devrait resoudre le glb associe au FCStd et le rendre', async () => {
            mockApp.getFile.mockImplementation((p: string) =>
                Promise.resolve(p === '3D/EOLI.glb' ? { path: p } : null)
            );
            mockVault.readLinkFile.mockReturnValue('3D/EOLI.FCStd');

            const container = property.fillDisplay('[[3D/EOLI.FCStd]]', jest.fn());
            await flushAsync();

            const canvas = container.querySelector('canvas.embed-media');
            expect(canvas).toBeTruthy();
            const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');
            const loaderInstance = (GLTFLoader as jest.Mock).mock.results[0]?.value;
            expect(loaderInstance.load).toHaveBeenCalledWith('app://local/vault/3D/EOLI.glb', expect.any(Function), undefined, expect.any(Function));
        });

        it('devrait resoudre le glb par le Code de la classe (nom de fichier avec .md)', async () => {
            // Le Code est une FormulaProperty (write: false) : absent du frontmatter,
            // lisible uniquement via la propriete
            const mockFile = {
                getName: jest.fn().mockReturnValue('SOCLE.md'),
                getPropertyValue: jest.fn().mockResolvedValue(undefined),
                getProperty: jest.fn().mockReturnValue({
                    read: jest.fn().mockResolvedValue('I-MOD-EOL-EOLI-SOCLE')
                })
            };
            mockApp.getFile.mockImplementation((p: string) =>
                Promise.resolve(p === '3D/I-MOD-EOL-EOLI-SOCLE.glb' ? { path: p } : null)
            );
            mockVault.readLinkFile.mockReturnValue('3D/I-MOD-EOL-EOLI-SOCLE - Socle de l eolienne.FCStd');

            const container = property.fillDisplay('[[3D/I-MOD-EOL-EOLI-SOCLE - Socle de l eolienne.FCStd]]', jest.fn(), mockFile);
            await flushAsync();

            const canvas = container.querySelector('canvas.embed-media');
            expect(canvas).toBeTruthy();

            const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');
            const loaderInstance = (GLTFLoader as jest.Mock).mock.results[0]?.value;
            expect(loaderInstance.load).toHaveBeenCalledWith(
                'app://local/vault/3D/I-MOD-EOL-EOLI-SOCLE.glb',
                expect.any(Function),
                undefined,
                expect.any(Function)
            );
        });

        it('devrait remonter a la Classe depuis le wrapper File (cas MediaProperty.getDisplay)', async () => {
            // MediaProperty.getDisplay passe classe.getFile() a fillDisplay :
            // un wrapper File, pas la Classe. La Classe se resout via Vault.getFromFile.
            const mockClasse = {
                getName: jest.fn().mockReturnValue('SOCLE.md'),
                getPropertyValue: jest.fn().mockResolvedValue(undefined),
                getProperty: jest.fn().mockReturnValue({
                    read: jest.fn().mockResolvedValue('I-MOD-EOL-EOLI-SOCLE')
                })
            };
            const fileWrapper = { file: { path: 'I - Impulsion/MOD/EOL/EOLI/SOCLE/SOCLE.md' } };
            mockVault.getFromFile = jest.fn().mockResolvedValue(mockClasse);
            mockApp.getFile.mockImplementation((p: string) =>
                Promise.resolve(p.endsWith('I-MOD-EOL-EOLI-SOCLE.glb') ? { path: p } : null)
            );
            mockVault.readLinkFile.mockReturnValue('3D/I-MOD-EOL-EOLI-SOCLE - Socle.FCStd');

            const container = property.fillDisplay('[[3D/I-MOD-EOL-EOLI-SOCLE - Socle.FCStd]]', jest.fn(), fileWrapper);
            await flushAsync();

            expect(mockVault.getFromFile).toHaveBeenCalledWith(fileWrapper.file);

            const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');
            const loaderInstance = (GLTFLoader as jest.Mock).mock.results[0]?.value;
            expect(loaderInstance.load).toHaveBeenCalledWith(
                'app://local/vault/3D/I-MOD-EOL-EOLI-SOCLE.glb',
                expect.any(Function),
                undefined,
                expect.any(Function)
            );
        });

        it('devrait afficher une erreur et un bouton FreeCAD si aucun glb trouve', async () => {
            mockVault.readLinkFile.mockReturnValue('3D/EOLI.FCStd');

            const container = property.fillDisplay('[[3D/EOLI.FCStd]]', jest.fn());
            await flushAsync();

            const errorDiv = container.querySelector('.embed-3d-error');
            expect(errorDiv).toBeTruthy();
            expect(errorDiv!.textContent).toContain('Rendu 3D introuvable');

            const button = container.querySelector('button.open-external-button') as HTMLButtonElement;
            expect(button).toBeTruthy();
            expect(button.textContent).toContain('FreeCAD');

            button!.dispatchEvent(new MouseEvent('click'));
            await flushAsync();
            expect(mockApp.openExternal).toHaveBeenCalledWith('3D/EOLI.FCStd');
        });

        it('devrait proposer le FCStd a l ouverture depuis le rendu glb', async () => {
            mockApp.getFile.mockImplementation((p: string) =>
                Promise.resolve(p === '3D/EOLI.glb' ? { path: p } : null)
            );
            mockVault.readLinkFile.mockReturnValue('3D/EOLI.FCStd');

            const container = property.fillDisplay('[[3D/EOLI.FCStd]]', jest.fn());
            await flushAsync();

            const button = container.querySelector('button.open-external-button') as HTMLButtonElement;
            button!.dispatchEvent(new MouseEvent('click'));
            await flushAsync();
            expect(mockApp.openExternal).toHaveBeenCalledWith('3D/EOLI.FCStd');
        });
    });

    describe('fillDisplay - fallbacks', () => {
        it('devrait deleguer a MediaProperty pour un fichier non 3D', () => {
            const superSpy = jest.spyOn(MediaProperty.prototype, 'fillDisplay');
            property.fillDisplay('[[image.png]]', jest.fn());
            expect(superSpy).toHaveBeenCalled();
            superSpy.mockRestore();
        });

        it('devrait deleguer a MediaProperty pour une valeur vide', () => {
            const superSpy = jest.spyOn(MediaProperty.prototype, 'fillDisplay');
            property.fillDisplay('', jest.fn());
            expect(superSpy).toHaveBeenCalled();
            superSpy.mockRestore();
        });

        it('devrait deleguer a MediaProperty pour un lien cassé (pas de path)', () => {
            mockVault.readLinkFile.mockReturnValue('');
            const superSpy = jest.spyOn(MediaProperty.prototype, 'fillDisplay');
            property.fillDisplay('[[fichier-inconnu.glb]]', jest.fn());
            expect(superSpy).toHaveBeenCalled();
            superSpy.mockRestore();
        });
    });

    describe('WebLB indisponible', () => {
        it('devrait afficher une erreur propre si le renderer echoue', async () => {
            const THREE = require('three');
            (THREE.WebGLRenderer as jest.Mock).mockImplementationOnce(() => {
                throw new Error('WebGL not available');
            });
            mockApp.getFile.mockResolvedValue({ path: '3D/model.glb' });

            const container = property.fillDisplay('[[3D/model.glb]]', jest.fn());
            await flushAsync();

            expect(container.querySelector('.embed-3d-error')).toBeTruthy();
        });
    });
});
