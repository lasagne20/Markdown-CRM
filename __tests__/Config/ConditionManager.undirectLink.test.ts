import { ConditionManager, UndirectLinkCondition } from "../../src/Config/ConditionManager";
import { Vault } from "../../src/vault/Vault";
import { Classe } from "../../src/vault/Classe";
import { TextProperty } from "../../src/properties/TextProperty";
import { mockApp } from '../utils/mocks';

describe('ConditionManager - UndirectLink Tests', () => {
    let manager: ConditionManager;
    let vault: Vault;
    let app: any;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        manager = new ConditionManager(vault); // Pass vault for auto-discovery
    });

    // Créer des instances de test
    function createMockClasse(name: string, properties: { [key: string]: any } = {}): Classe {
        const classe = new Classe(vault);
        (classe as any).name = name;
        
        // Créer les propriétés pour cette classe
        const propertyArray: any[] = [];
        Object.entries(properties).forEach(([key, value]) => {
            const property = new TextProperty(key, vault, {});
            jest.spyOn(property, 'read').mockResolvedValue(value);
            propertyArray.push(property);
        });
        
        (classe as any).properties = propertyArray;
        return classe;
    }

    describe('evaluateUndirectLinkCondition', () => {
        test('should return false when no referencing files exist', async () => {
            const commune = createMockClasse('Paris');

            const condition: UndirectLinkCondition = {
                conditionType: 'undirectLink',
                referencingFiles: []
            };

            const result = await manager.evaluateCondition(condition, commune);

            expect(result).toBe(false);
        });

        test('should return false when referencingFiles is undefined and searchAllFiles is false', async () => {
            const commune = createMockClasse('Paris');

            const condition: UndirectLinkCondition = {
                conditionType: 'undirectLink'
            };

            const result = await manager.evaluateCondition(condition, commune);

            expect(result).toBe(false);
        });

        test('should use auto-discovery when searchAllFiles is true', async () => {
            const commune = createMockClasse('Paris');
            const action1 = createMockClasse('action1', { lieu: '[[Paris]]' });

            // Mock the getAllFilesFromVault method directly
            jest.spyOn(manager as any, 'getAllFilesFromVault').mockResolvedValue([action1, commune]);

            // Mock getAllProperties to return properties that can be checked
            const mockProperty = new TextProperty('lieu', vault, {});
            jest.spyOn(mockProperty, 'read').mockResolvedValue('[[Paris]]');
            (mockProperty as any).type = 'file';
            jest.spyOn(action1, 'getAllProperties').mockReturnValue({
                lieu: mockProperty
            });

            // Mock hasLinkToDocument to return true for action1 (links to Paris)  
            jest.spyOn(manager as any, 'hasLinkToDocument').mockImplementation((...args: any[]) => {
                const [propertyValue, fileName] = args;
                return propertyValue && propertyValue.includes(fileName);
            });

            const condition: UndirectLinkCondition = {
                conditionType: 'undirectLink',
                searchAllFiles: true
            };

            const result = await manager.evaluateCondition(condition, commune);

            expect(result).toBe(true);
        });

        test('should apply filter condition on discovered referencing files', async () => {
            const commune = createMockClasse('Paris');
            const action1 = createMockClasse('action1', { lieu: '[[Paris]]', partenariat: 'Partenaire A' });

            // Mock the getAllFilesFromVault method directly
            jest.spyOn(manager as any, 'getAllFilesFromVault').mockResolvedValue([action1, commune]);

            // Mock getAllProperties to return properties with the right type
            const mockProperty2 = new TextProperty('lieu', vault, {});
            jest.spyOn(mockProperty2, 'read').mockResolvedValue('[[Paris]]');
            (mockProperty2 as any).type = 'file';
            jest.spyOn(action1, 'getAllProperties').mockReturnValue({
                lieu: mockProperty2
            });

            // Mock hasLinkToDocument to return true for action1 (links to Paris)
            jest.spyOn(manager as any, 'hasLinkToDocument').mockReturnValue(true);

            // Mock getPropertyValue for the filter condition
            jest.spyOn(manager as any, 'getPropertyValue').mockImplementation(async (...args: any[]) => {
                const [instance, propertyName] = args;
                if (propertyName === 'partenariat' && (instance as any).name === 'action1') {
                    return 'Partenaire A';
                }
                return null;
            });

            const condition: UndirectLinkCondition = {
                conditionType: 'undirectLink',
                searchAllFiles: true,
                filterCondition: {
                    property: 'partenariat',
                    type: 'equals',
                    value: 'Partenaire A'
                }
            };

            const result = await manager.evaluateCondition(condition, commune);

            expect(result).toBe(true); // Should find action1 which has 'Partenaire A'
        });
    });

    describe('Injection utilities', () => {
        test('injectReferencingFiles should inject referencingFiles into conditions array', () => {
            const files = [
                createMockClasse('action1'),
                createMockClasse('action2')
            ];

            const conditions: UndirectLinkCondition[] = [{
                conditionType: 'undirectLink'
            }];

            const result = manager.injectReferencingFiles(conditions, files);

            expect(result.length).toBe(1);
            const undirectCondition = result[0] as UndirectLinkCondition;
            expect(undirectCondition.referencingFiles).toBe(files);
            expect(undirectCondition.referencingFiles?.length).toBe(2);
        });
    });

    describe('Condition recognition', () => {
        test('should recognize UndirectLinkCondition through evaluateCondition', async () => {
            const condition: UndirectLinkCondition = {
                conditionType: 'undirectLink',
                searchAllFiles: true
            };
            
            const commune = createMockClasse('Paris');
            jest.spyOn(manager as any, 'getAllFilesFromVault').mockResolvedValue([]);

            // This should not throw an error, meaning the condition is recognized
            const result = await manager.evaluateCondition(condition, commune);
            expect(result).toBe(false); // false because no files found, but no error thrown
        });
    });
});