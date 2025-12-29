import { DisplayRenderer } from '../../src/display/DisplayRenderer';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { mockApp } from '../utils/mocks';

describe('DisplayRenderer - Pseudo Instances for ObjectProperty', () => {
    let vault: Vault;
    let app: any;
    let mockParentInstance: Classe;
    let displayRenderer: DisplayRenderer;
    let mockProperty: any;
    let mockFactory: any;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, {
            vaultPath: './test-vault',
            configPath: '__tests__/Config/test-configs'
        } as any);

        // Create mock parent instance
        mockParentInstance = new Classe(vault);
        (mockParentInstance as any).file = {
            getPath: () => 'TestClass.md',
            getName: () => 'TestClass'
        };
        
        // Mock getPropertyValue to return array data
        jest.spyOn(mockParentInstance, 'getPropertyValue').mockImplementation(async (propName: string) => {
            if (propName === 'animateurs') {
                return [
                    { nom: 'John Doe', tarif: 1000, statut: 'actif' },
                    { nom: 'Jane Smith', tarif: 1200, statut: 'inactif' }
                ];
            }
            return undefined;
        });
        
        // Mock updatePropertyValue to track calls
        jest.spyOn(mockParentInstance, 'updatePropertyValue').mockImplementation(async (propName: string, value: any) => {
            // Simulate successful update
        });
        
        // Mock getName method
        jest.spyOn(mockParentInstance, 'getName').mockReturnValue('TestClass');
        jest.spyOn(mockParentInstance, 'getPath').mockReturnValue('TestClass.md');
        
        // Create mock property for ObjectProperty
        mockProperty = {
            type: 'object',
            name: 'animateurs',
            read: jest.fn().mockResolvedValue([
                { nom: 'John Doe', tarif: 1000, statut: 'actif' },
                { nom: 'Jane Smith', tarif: 1200, statut: 'inactif' }
            ])
        };
        
        jest.spyOn(mockParentInstance, 'getProperty').mockImplementation((propName: string) => {
            if (propName === 'animateurs') {
                return mockProperty;
            }
            return null;
        });

        // Mock the factory to return our mock instance
        mockFactory = {
            getAllInstancesForClass: jest.fn().mockResolvedValue([mockParentInstance])
        };
        
        jest.spyOn(vault, 'getDynamicClassFactory').mockReturnValue(mockFactory);

        displayRenderer = new DisplayRenderer(vault, {}, mockParentInstance);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should create pseudo-instances with correct metadata', async () => {
        const source = {
            class: 'TestClass.animateurs',
            smartFilter: 'all'
        };

        const pseudoInstances = await (displayRenderer as any).getObjectPropertyItems(source);

        expect(pseudoInstances).toHaveLength(2);
        
        const firstInstance = pseudoInstances[0];
        expect(firstInstance._isObjectPropertyItem).toBe(true);
        expect(firstInstance._parentInstance).toBe(mockParentInstance);
        expect(firstInstance._propertyName).toBe('animateurs');
        expect(firstInstance._index).toBe(0);
        expect(firstInstance.getPath()).toBe('TestClass.md#animateurs[0]');
    });

    it('should update pseudo-instance property and save to parent file', async () => {
        const source = {
            class: 'TestClass.animateurs',
            smartFilter: 'all'
        };

        const pseudoInstances = await (displayRenderer as any).getObjectPropertyItems(source);
        const firstInstance = pseudoInstances[0];

        // Test updatePropertyValue method
        await firstInstance.updatePropertyValue('tarif', 1500);

        // Verify the parent's updatePropertyValue was called with the updated array
        expect(mockParentInstance.updatePropertyValue).toHaveBeenCalledWith(
            'animateurs',
            expect.arrayContaining([
                expect.objectContaining({ nom: 'John Doe', tarif: 1500, statut: 'actif' }),
                expect.objectContaining({ nom: 'Jane Smith', tarif: 1200, statut: 'inactif' })
            ])
        );
    });

    it('should handle invalid index gracefully', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        // Create pseudo-instance with invalid index
        const invalidPseudoInstance = (displayRenderer as any).createPseudoInstance(
            { nom: 'Test', tarif: 1000 },
            mockParentInstance,
            'animateurs',
            99, // Invalid index
            'TestClass'
        );

        await invalidPseudoInstance.updatePropertyValue('tarif', 2000);

        // Should log error for invalid index
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('❌ Index 99 invalide pour le tableau animateurs')
        );
        
        // Should not call parent updatePropertyValue
        expect(mockParentInstance.updatePropertyValue).not.toHaveBeenCalled();
        
        consoleSpy.mockRestore();
    });

    it('should provide correct property access for nested data', async () => {
        const source = {
            class: 'TestClass.animateurs',
            smartFilter: 'all'
        };

        const pseudoInstances = await (displayRenderer as any).getObjectPropertyItems(source);
        const firstInstance = pseudoInstances[0];

        // Test getPropertyValue method
        expect(await firstInstance.getPropertyValue('nom')).toBe('John Doe');
        expect(await firstInstance.getPropertyValue('tarif')).toBe(1000);
        expect(await firstInstance.getPropertyValue('_fileName')).toBe('TestClass.animateurs[0]');
        expect(await firstInstance.getPropertyValue('_parentFile')).toBe('TestClass');
    });

    it('should update local object for immediate UI feedback', async () => {
        const source = {
            class: 'TestClass.animateurs',
            smartFilter: 'all'
        };

        const pseudoInstances = await (displayRenderer as any).getObjectPropertyItems(source);
        const firstInstance = pseudoInstances[0];

        // Get reference to the underlying object
        const originalObject = firstInstance._objectData;
        expect(originalObject.tarif).toBe(1000);

        // Update property
        await firstInstance.updatePropertyValue('tarif', 1500);

        // Verify immediate local update
        expect(originalObject.tarif).toBe(1500);
        expect(await firstInstance.getPropertyValue('tarif')).toBe(1500);
    });
});