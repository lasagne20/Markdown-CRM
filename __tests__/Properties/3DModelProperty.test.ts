/**
 * @jest-environment jsdom
 */

import { ThreeDModelProperty } from '../../src/properties/3DModelProperty';
import { MediaProperty } from '../../src/properties/MediaProperty';

// Mock complex dependencies
jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn()
}));

// Mock external dependencies
(global as any).Notice = jest.fn();
(global as any).selectMedia = jest.fn();
(global as any).shell = {
    openPath: jest.fn()
};

// Mock THREE.js dependencies
(global as any).THREE = {
    WebGLRenderer: jest.fn().mockImplementation(() => ({
        setSize: jest.fn(),
        domElement: document.createElement('canvas'),
        render: jest.fn()
    })),
    Scene: jest.fn().mockImplementation(() => ({
        add: jest.fn()
    })),
    PerspectiveCamera: jest.fn().mockImplementation(() => ({
        position: { set: jest.fn() },
        up: { set: jest.fn() },
        lookAt: jest.fn()
    })),
    DirectionalLight: jest.fn().mockImplementation(() => ({
        position: { set: jest.fn() },
        target: { position: { set: jest.fn() } }
    })),
    AmbientLight: jest.fn(),
    Box3: jest.fn().mockImplementation(() => ({
        setFromObject: jest.fn().mockReturnThis(),
        getCenter: jest.fn(),
        getSize: jest.fn()
    })),
    Vector3: jest.fn().mockImplementation(() => ({
        sub: jest.fn()
    }))
};

(global as any).GLTFLoader = jest.fn().mockImplementation(() => ({
    load: jest.fn()
}));

(global as any).OrbitControls = jest.fn().mockImplementation(() => ({
    enableDamping: true,
    dampingFactor: 0.05,
    enableZoom: true,
    enablePan: true,
    enableRotate: true,
    minPolarAngle: 0,
    maxPolarAngle: Math.PI,
    target: { set: jest.fn() },
    update: jest.fn()
}));

(global as any).FreecadFile = jest.fn();

describe('ThreeDModelProperty', () => {
    let property: ThreeDModelProperty;
    let mockVault: any;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Create mock vault
        mockVault = {
            app: {
                getFile: jest.fn().mockReturnValue({ path: 'test.gltf' }),
                getAbsolutePath: jest.fn().mockReturnValue('/absolute/path/test.gltf'),
                setIcon: jest.fn(),
                vault: {
                    getFiles: jest.fn().mockReturnValue([]),
                    adapter: {
                        getResourcePath: jest.fn().mockReturnValue('/mock/path')
                    }
                }
            },
            getMediaFromLink: jest.fn().mockReturnValue({
                path: 'test.glb',
                name: 'test.glb'
            }),
            readLinkFile: jest.fn().mockReturnValue('test.gltf')
        };

        property = new ThreeDModelProperty('test3d', mockVault);
        property.vault = mockVault;
    });

    describe('Constructor', () => {
        it('should create a ThreeDModelProperty with correct type', () => {
            expect(property.type).toBe('3dmodel');
        });

        it('should inherit from MediaProperty', () => {
            expect(property).toBeInstanceOf(MediaProperty);
        });

        it('should set default icon to box', () => {
            expect(property.icon).toBe('box');
        });
    });

    describe('fillDisplay method', () => {
        it('should handle 3D model files (gltf)', () => {
            const mockUpdate = jest.fn();
            
            mockVault.getMediaFromLink.mockReturnValue({
                path: 'model.gltf',
                name: 'model.gltf'
            });

            mockVault.readLinkFile.mockReturnValue('model.gltf');

            mockVault.app.vault.getFiles.mockReturnValue([
                { path: 'model.gltf' }
            ]);

            const result = property.fillDisplay('[[model.gltf]]', mockUpdate);
            
            expect(result).toBeInstanceOf(HTMLDivElement);
            expect(result.classList.contains('embed-container')).toBe(true);
        });

        it('should handle 3D model files (glb)', () => {
            const mockUpdate = jest.fn();
            
            mockVault.getMediaFromLink.mockReturnValue({
                path: 'model.glb',
                name: 'model.glb'
            });

            mockVault.readLinkFile.mockReturnValue('model.glb');

            mockVault.app.vault.getFiles.mockReturnValue([
                { path: 'model.glb' }
            ]);

            const result = property.fillDisplay('[[model.glb]]', mockUpdate);
            
            expect(result).toBeInstanceOf(HTMLDivElement);
            expect(result.classList.contains('embed-container')).toBe(true);
        });

        it('should fallback to parent MediaProperty for non-3D files', () => {
            const mockUpdate = jest.fn();
            
            mockVault.getMediaFromLink.mockReturnValue({
                path: 'image.png',
                name: 'image.png'
            });

            mockVault.readLinkFile.mockReturnValue('image.png');

            const result = property.fillDisplay('[[image.png]]', mockUpdate);
            
            // Should call parent method for non-3D files
            expect(result).toBeInstanceOf(HTMLDivElement);
        });

        it('should handle missing media file', () => {
            const mockUpdate = jest.fn();
            
            mockVault.getMediaFromLink.mockReturnValue(null);

            const result = property.fillDisplay('[[missing.glb]]', mockUpdate);
            
            // Should call parent method when media file not found
            expect(result).toBeInstanceOf(HTMLDivElement);
        });
    });

    describe('render3DModel method', () => {
        it('should create error message when file does not exist', () => {
            const container = document.createElement('div');
            
            // Mock getFile to return null for missing file
            mockVault.app.getFile.mockReturnValue(null);
            
            property['render3DModel']('missing.glb', container);
            
            expect(container.children.length).toBeGreaterThan(0);
            const errorDiv = container.firstElementChild as HTMLDivElement;
            expect(errorDiv.textContent).toContain('Rendu 3D introuvable');
        });

        it('should create canvas when file exists', () => {
            const container = document.createElement('div');
            
            mockVault.app.vault.getFiles.mockReturnValue([
                { path: 'test.glb' }
            ]);
            
            property['render3DModel']('test.glb', container);
            
            expect(container.querySelector('canvas')).toBeTruthy();
        });
    });
});
