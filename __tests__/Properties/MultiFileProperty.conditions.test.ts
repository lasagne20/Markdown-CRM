import { MultiFileProperty } from '../../src/properties/MultiFileProperty';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';
import { Condition, ConditionManager } from '../../src/Config/ConditionManager';

describe('MultiFileProperty with Conditions', () => {
    let vault: Vault;
    let app: any;
    let conditionManager: ConditionManager;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        // conditionManager is automatically initialized in Vault constructor
    });

    describe('Constructor', () => {
        test('should store conditions when provided', () => {
            const conditions: Condition[] = [
                { property: 'status', type: 'equals', value: 'active' }
            ];

            const multiFileProperty = new MultiFileProperty('contacts', vault, ['Personne'], {
                conditions
            });

            expect(multiFileProperty.conditions).toEqual(conditions);
        });

        test('should pass conditions to internal FileProperty', () => {
            const conditions: Condition[] = [
                { property: 'status', type: 'equals', value: 'active' }
            ];

            const multiFileProperty = new MultiFileProperty('contacts', vault, ['Personne'], {
                conditions
            });

            expect(multiFileProperty.property.conditions).toEqual(conditions);
        });

        test('should have undefined conditions when not provided', () => {
            const multiFileProperty = new MultiFileProperty('contacts', vault, ['Personne']);

            expect(multiFileProperty.conditions).toBeUndefined();
            expect(multiFileProperty.property.conditions).toBeUndefined();
        });

        test('should store multiple conditions', () => {
            const conditions: Condition[] = [
                { property: 'status', type: 'equals', value: 'active' },
                { property: 'relation', type: 'equalsAny', values: ['Client', 'Partenaire'] }
            ];

            const multiFileProperty = new MultiFileProperty('contacts', vault, ['Personne'], {
                conditions
            });

            expect(multiFileProperty.conditions).toHaveLength(2);
            expect(multiFileProperty.property.conditions).toEqual(conditions);
        });
    });

    describe('Internal FileProperty behavior', () => {
        test('should use FileProperty with conditions for selection', async () => {
            const conditions: Condition[] = [
                { property: 'statut', type: 'equals', value: 'Actif' }
            ];

            const multiFileProperty = new MultiFileProperty('contacts', vault, ['Personne'], {
                conditions
            });

            const mockSelectedFile = {
                getLink: jest.fn().mockReturnValue('[[Jean Dupont]]'),
                getPath: jest.fn().mockReturnValue('Jean Dupont.md')
            };

            app.selectFile = jest.fn().mockResolvedValue(mockSelectedFile);
            
            const mockUpdate = jest.fn();
            const mockEvent = {
                target: document.createElement('div')
            } as any;

            // The internal property should use the conditions
            await multiFileProperty.property.handleIconClick(mockUpdate, mockEvent);

            expect(app.selectFile).toHaveBeenCalledWith(
                vault,
                ['Personne'],
                expect.objectContaining({
                    validationFunction: expect.any(Function)
                })
            );
        });

        test('should filter with complex conditions', () => {
            const conditions: Condition[] = [
                { property: 'type', type: 'equals', value: 'Institution' },
                { property: 'population', type: 'greaterThan', value: 50000 },
                { property: 'description', type: 'isNotEmpty' }
            ];

            const multiFileProperty = new MultiFileProperty('institutions', vault, ['Institution'], {
                conditions
            });

            expect(multiFileProperty.property.conditions).toEqual(conditions);
            expect(multiFileProperty.property.conditions).toHaveLength(3);
        });
    });

    describe('Integration with other properties', () => {
        test('should preserve icon and tooltip with conditions', () => {
            const conditions: Condition[] = [
                { property: 'statut', type: 'equals', value: 'Actif' }
            ];

            const multiFileProperty = new MultiFileProperty('contacts', vault, ['Personne'], {
                icon: '👤',
                tooltip: 'Select active contacts',
                conditions
            });

            expect(multiFileProperty.icon).toBe('👤');
            expect(multiFileProperty.tooltip).toBe('Select active contacts');
            expect(multiFileProperty.conditions).toEqual(conditions);
            // L'icône est supprimée du FileProperty car elle est affichée par le MultiFileProperty lui-même
            expect(multiFileProperty.property.icon).toBe('align-left');
            expect(multiFileProperty.property.tooltip).toBe('Select active contacts');
        });

        test('should work with aliases and conditions', () => {
            const conditions: Condition[] = [
                { property: 'relation', type: 'equalsAny', values: ['Client', 'Fournisseur'] }
            ];

            const multiFileProperty = new MultiFileProperty('partenaires', vault, ['Personne'], {
                aliases: ['partners', 'contacts'],
                conditions
            });

            expect(multiFileProperty.aliases).toEqual(['partners', 'contacts']);
            expect(multiFileProperty.conditions).toEqual(conditions);
        });
    });

    describe('Classes handling', () => {
        test('should work with multiple classes and conditions', () => {
            const conditions: Condition[] = [
                { property: 'status', type: 'equals', value: 'active' }
            ];

            const multiFileProperty = new MultiFileProperty('related', vault, ['Institution', 'Lieu'], {
                conditions
            });

            expect(multiFileProperty.getClasses()).toEqual(['Institution', 'Lieu']);
            expect(multiFileProperty.conditions).toEqual(conditions);
            expect(multiFileProperty.property.getClasses()).toEqual(['Institution', 'Lieu']);
        });

        test('should filter across multiple classes', () => {
            const conditions: Condition[] = [
                { property: 'type', type: 'equalsAny', values: ['Commune', 'Région'] },
                { property: 'population', type: 'greaterThanOrEqual', value: 1000 }
            ];

            const multiFileProperty = new MultiFileProperty('lieux', vault, ['Lieu'], {
                conditions
            });

            expect(multiFileProperty.property.conditions).toEqual(conditions);
        });
    });

    describe('Edge cases', () => {
        test('should handle empty conditions array', () => {
            const conditions: Condition[] = [];

            const multiFileProperty = new MultiFileProperty('contacts', vault, ['Personne'], {
                conditions
            });

            expect(multiFileProperty.conditions).toEqual([]);
            expect(multiFileProperty.property.conditions).toEqual([]);
        });

        test('should handle conditions with isEmpty', () => {
            const conditions: Condition[] = [
                { property: 'email', type: 'isEmpty' }
            ];

            const multiFileProperty = new MultiFileProperty('contacts', vault, ['Personne'], {
                conditions
            });

            expect(multiFileProperty.conditions).toEqual(conditions);
        });

        test('should handle conditions with contains', () => {
            const conditions: Condition[] = [
                { property: 'nom', type: 'contains', value: 'Paris' }
            ];

            const multiFileProperty = new MultiFileProperty('lieux', vault, ['Lieu'], {
                conditions
            });

            expect(multiFileProperty.property.conditions).toEqual(conditions);
        });

        test('should handle conditions with notEquals', () => {
            const conditions: Condition[] = [
                { property: 'statut', type: 'notEquals', value: 'Inactif' }
            ];

            const multiFileProperty = new MultiFileProperty('contacts', vault, ['Personne'], {
                conditions
            });

            expect(multiFileProperty.conditions).toEqual(conditions);
        });
    });
});
