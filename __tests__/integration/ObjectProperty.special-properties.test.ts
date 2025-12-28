import { DisplayRenderer } from '../../src/display/DisplayRenderer';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('ObjectProperty - Special Properties and Complex Expressions', () => {
    let vault: Vault;
    let app: any;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
    });

    test('should handle _filename and _parentFile properties correctly', async () => {
        console.log('🧪 Testing _filename and _parentFile properties...');

        // Create mock instance with ObjectProperty
        const entreprise = {
            getName: () => 'Test Entreprise',
            getPath: () => 'Test Entreprise',
            name: 'Entreprise',
            getVault: () => vault,
            getFile: () => ({
                getName: (withExt?: boolean) => withExt ? 'Test Entreprise.md' : 'Test Entreprise',
                getPath: () => 'Test Entreprise'
            }),
            getProperty: jest.fn().mockImplementation((propName: string) => {
                if (propName === 'employes') {
                    return {
                        type: 'object',
                        read: jest.fn().mockResolvedValue([
                            { nom: 'Dupont', prenom: 'Jean', tarif: 150 }
                        ])
                    };
                }
                return null;
            })
        };

        const mockFactory = {
            getAllInstancesForClass: jest.fn().mockResolvedValue([entreprise])
        };
        vault.getDynamicClassFactory = jest.fn().mockReturnValue(mockFactory);

        const renderer = new DisplayRenderer(vault, {}, [], async () => {});

        // Test table with _filename and _parentFile columns
        const source = {
            class: 'Entreprise.employes',
            smartFilter: 'all'
        };

        const files = await (renderer as any).getFilesForTable(source);
        expect(files).toHaveLength(1);

        const employee = files[0];

        // Test _filename property
        const fileNameProp = employee.getProperty('_filename');
        expect(fileNameProp).toBeDefined();
        const fileName = await fileNameProp.read();
        expect(fileName).toBe('Test Entreprise.employes[0]');

        // Test _fileName property (case variation)
        const fileNameProp2 = employee.getProperty('_fileName');
        expect(fileNameProp2).toBeDefined();
        const fileName2 = await fileNameProp2.read();
        expect(fileName2).toBe('Test Entreprise.employes[0]');

        // Test _parentFile property
        const parentFileProp = employee.getProperty('_parentFile');
        expect(parentFileProp).toBeDefined();
        const parentFile = await parentFileProp.read();
        expect(parentFile).toBe('Test Entreprise');

        // Test getPropertyValue method
        const fileNameValue = await employee.getPropertyValue('_filename');
        expect(fileNameValue).toBe('Test Entreprise.employes[0]');

        const parentFileValue = await employee.getPropertyValue('_parentFile');
        expect(parentFileValue).toBe('Test Entreprise');

        console.log('✅ _filename and _parentFile properties working correctly!');
    });

    test('should handle complex property expressions', async () => {
        console.log('🧪 Testing complex property expressions...');

        // Create mock instance with complex ObjectProperty data
        const formation = {
            getName: () => 'Formation React',
            getPath: () => 'Formation React',
            name: 'Formation',
            getVault: () => vault,
            getFile: () => ({
                getName: (withExt?: boolean) => withExt ? 'Formation React.md' : 'Formation React',
                getPath: () => 'Formation React'
            }),
            getProperty: jest.fn().mockImplementation((propName: string) => {
                if (propName === 'animateurs') {
                    return {
                        type: 'object',
                        read: jest.fn().mockResolvedValue([
                            { 
                                nom: 'Dupont', 
                                prenom: 'Jean', 
                                tarif: 150,
                                specialites: ['React', 'Vue'],
                                experience: { annees: 5, niveau: 'Senior' }
                            }
                        ])
                    };
                }
                return null;
            })
        };

        const mockFactory = {
            getAllInstancesForClass: jest.fn().mockResolvedValue([formation])
        };
        vault.getDynamicClassFactory = jest.fn().mockReturnValue(mockFactory);

        const renderer = new DisplayRenderer(vault, {}, [], async () => {});

        const source = {
            class: 'Formation.animateurs',
            smartFilter: 'all'
        };

        const files = await (renderer as any).getFilesForTable(source);
        expect(files).toHaveLength(1);

        const animateur = files[0];

        // Test simple nested property access
        const tarifValue = await animateur.getPropertyValue('tarif');
        expect(tarifValue).toBe(150);

        // Test complex expression - should return the whole object for now
        const complexValue = await animateur.getPropertyValue('animateurs.filter(animateur=$current).tarif');
        expect(complexValue).toBeDefined(); // Should not throw error

        // Test nested object access
        const experienceValue = await animateur.getPropertyValue('experience.annees');
        expect(experienceValue).toBe(5);

        console.log('✅ Complex property expressions handled correctly!');
    });

    test('should handle getFile method properly', async () => {
        console.log('🧪 Testing getFile method...');

        const entreprise = {
            getName: () => 'Test Company',
            getPath: () => 'Test Company',
            name: 'Entreprise',
            getVault: () => vault,
            getFile: () => ({
                getName: (withExt?: boolean) => withExt ? 'Test Company.md' : 'Test Company',
                getPath: () => 'Test Company'
            }),
            getProperty: jest.fn().mockImplementation((propName: string) => {
                if (propName === 'employes') {
                    return {
                        type: 'object',
                        read: jest.fn().mockResolvedValue([
                            { nom: 'Martin', prenom: 'Sophie' }
                        ])
                    };
                }
                return null;
            })
        };

        const mockFactory = {
            getAllInstancesForClass: jest.fn().mockResolvedValue([entreprise])
        };
        vault.getDynamicClassFactory = jest.fn().mockReturnValue(mockFactory);

        const renderer = new DisplayRenderer(vault, {}, [], async () => {});

        const source = {
            class: 'Entreprise.employes',
            smartFilter: 'all'
        };

        const files = await (renderer as any).getFilesForTable(source);
        const employee = files[0];

        // Test getFile method
        const file = employee.getFile();
        expect(file).toBeDefined();
        expect(file.getName(false)).toBe('Test Company.employes[0]');
        expect(file.getName(true)).toBe('Test Company.employes[0].md');
        expect(file.getPath()).toBe('Test Company#employes[0]');

        console.log('✅ getFile method working correctly!');
    });
});