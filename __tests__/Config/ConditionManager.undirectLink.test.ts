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
        manager = new ConditionManager();
    });

    // Créer des instances de test
    function createMockClasse(name: string, properties: { [key: string]: any } = {}): Classe {
        const classe = new Classe(vault);
        (classe as any).name = name;
        
        // Créer les propriétés pour cette classe
        const propertyArray: any[] = [];
        Object.entries(properties).forEach(([key, value]) => {
            const property = new TextProperty(key, vault, []);
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

        test('should return false when referencingFiles is undefined', async () => {
            const commune = createMockClasse('Paris');

            const condition: UndirectLinkCondition = {
                conditionType: 'undirectLink'
            };

            const result = await manager.evaluateCondition(condition, commune);

            expect(result).toBe(false);
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
        test('isCondition should recognize UndirectLinkCondition', () => {
            const condition: UndirectLinkCondition = {
                conditionType: 'undirectLink',
                referencingFiles: []
            };

            const result = manager.isCondition(condition);
            expect(result).toBe(true);
        });
    });
});