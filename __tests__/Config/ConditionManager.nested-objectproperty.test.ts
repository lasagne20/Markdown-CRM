import { ConditionManager, ContainsCondition } from '../../src/Config/ConditionManager';
import { Classe } from '../../src/vault/Classe';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { FileProperty } from '../../src/properties/FileProperty';

describe('ConditionManager - Nested ObjectProperty with $current', () => {
    let conditionManager: ConditionManager;
    let mockApp: any;
    let mockVault: any;

    beforeEach(() => {
        mockApp = {
            getVaultPath: jest.fn().mockReturnValue('/vault'),
            getName: jest.fn().mockReturnValue('TestVault'),
            listFiles: jest.fn().mockResolvedValue([]),
        };

        mockVault = {
            app: mockApp,
            getFromLink: jest.fn(),
        };

        conditionManager = new ConditionManager(mockVault);
    });

    describe('contains condition with nested ObjectProperty path', () => {
        it('should check all items in ObjectProperty list when using nested path', async () => {
            // Setup current document
            const currentActionFile = {
                getName: jest.fn().mockReturnValue('Action1.md'),
                getPath: jest.fn().mockReturnValue('actions/Action1.md'),
                getBasename: jest.fn().mockReturnValue('Action1'),
            };
            const currentAction = new Classe(mockApp);
            currentAction.setFile(currentActionFile as any);
            jest.spyOn(currentAction, 'getName').mockReturnValue('Action1');
            jest.spyOn(currentAction, 'getPath').mockReturnValue('actions/Action1.md');

            // Setup instance with ObjectProperty list
            const instance = new Classe(mockApp);
            
            // Mock suivie as ObjectProperty containing a list of objects
            // Each object has an 'action' property that can reference files
            const suivieData = [
                { action: '[[actions/Action1]]', date: '2024-01-01' },
                { action: '[[actions/Action2]]', date: '2024-01-02' },
                { action: '[[actions/Action3]]', date: '2024-01-03' },
            ];

            // Create mock ObjectProperty
            const suivieProp = {
                type: 'object',
                name: 'suivie',
                read: jest.fn().mockResolvedValue(suivieData),
                // Simulate nested access to 'action' within each object
                getNestedValue: jest.fn().mockImplementation(async (instance, nestedPath) => {
                    if (nestedPath === 'action') {
                        // Return all action values from the list
                        return suivieData.map(item => item.action);
                    }
                    return null;
                }),
            };

            jest.spyOn(instance, 'getProperty').mockImplementation((propName: string) => {
                if (propName === 'suivie' || propName === 'suivie.action') {
                    return suivieProp as any;
                }
                return undefined;
            });

            // Create condition: suivie.action contains $current
            const condition: ContainsCondition = {
                property: 'suivie.action',
                type: 'contains',
                value: '$current',
            };

            // Evaluate condition
            const result = await conditionManager.evaluateCondition(condition, instance, currentAction);

            // Should return true because suivieData[0].action contains Action1
            expect(result).toBe(true);
        });

        it('should return false when none of the ObjectProperty items match $current', async () => {
            const currentActionFile = {
                getName: jest.fn().mockReturnValue('Action99.md'),
                getPath: jest.fn().mockReturnValue('actions/Action99.md'),
                getBasename: jest.fn().mockReturnValue('Action99'),
            };
            const currentAction = new Classe(mockApp);
            currentAction.setFile(currentActionFile as any);
            jest.spyOn(currentAction, 'getName').mockReturnValue('Action99');
            jest.spyOn(currentAction, 'getPath').mockReturnValue('actions/Action99.md');

            const instance = new Classe(mockApp);
            
            const suivieData = [
                { action: '[[actions/Action1]]', date: '2024-01-01' },
                { action: '[[actions/Action2]]', date: '2024-01-02' },
            ];

            const suivieProp = {
                type: 'object',
                name: 'suivie',
                read: jest.fn().mockResolvedValue(suivieData),
                getNestedValue: jest.fn().mockImplementation(async (instance, nestedPath) => {
                    if (nestedPath === 'action') {
                        return suivieData.map(item => item.action);
                    }
                    return null;
                }),
            };

            jest.spyOn(instance, 'getProperty').mockImplementation((propName: string) => {
                if (propName === 'suivie' || propName === 'suivie.action') {
                    return suivieProp as any;
                }
                return undefined;
            });

            const condition: ContainsCondition = {
                property: 'suivie.action',
                type: 'contains',
                value: '$current',
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentAction);

            expect(result).toBe(false);
        });

        it('should handle nested path in ObjectProperty array correctly', async () => {
            const currentActionFile = {
                getName: jest.fn().mockReturnValue('Action2.md'),
                getPath: jest.fn().mockReturnValue('actions/Action2.md'),
                getBasename: jest.fn().mockReturnValue('Action2'),
            };
            const currentAction = new Classe(mockApp);
            currentAction.setFile(currentActionFile as any);
            jest.spyOn(currentAction, 'getName').mockReturnValue('Action2');
            jest.spyOn(currentAction, 'getPath').mockReturnValue('actions/Action2.md');

            const instance = new Classe(mockApp);
            
            // Array of objects with nested action property
            const suivieData = [
                { action: '[[actions/Action1]]', status: 'done' },
                { action: '[[actions/Action2]]', status: 'pending' },
                { action: '[[actions/Action3]]', status: 'cancelled' },
            ];

            const suivieProp = {
                type: 'object',
                name: 'suivie',
                read: jest.fn().mockResolvedValue(suivieData),
                getNestedValue: jest.fn().mockImplementation(async (instance, nestedPath) => {
                    if (nestedPath === 'action') {
                        return suivieData.map(item => item.action);
                    }
                    return null;
                }),
            };

            jest.spyOn(instance, 'getProperty').mockImplementation((propName: string) => {
                if (propName === 'suivie' || propName === 'suivie.action') {
                    return suivieProp as any;
                }
                return undefined;
            });

            const condition: ContainsCondition = {
                property: 'suivie.action',
                type: 'contains',
                value: '$current',
            };

            const result = await conditionManager.evaluateCondition(condition, instance, currentAction);

            // Should match Action2 in the second item
            expect(result).toBe(true);
        });
    });
});
