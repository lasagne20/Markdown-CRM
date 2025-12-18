import { FileProperty } from '../../src/properties/FileProperty';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';
import { Condition, ConditionManager } from '../../src/Config/ConditionManager';

describe('FileProperty with Conditions', () => {
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

            const fileProperty = new FileProperty('institution', vault, ['Institution'], {
                conditions
            });

            expect(fileProperty.conditions).toEqual(conditions);
        });

        test('should have undefined conditions when not provided', () => {
            const fileProperty = new FileProperty('institution', vault, ['Institution']);

            expect(fileProperty.conditions).toBeUndefined();
        });

        test('should store multiple conditions', () => {
            const conditions: Condition[] = [
                { property: 'status', type: 'equals', value: 'active' },
                { property: 'type', type: 'equalsAny', values: ['Institution', 'Lieu'] }
            ];

            const fileProperty = new FileProperty('institution', vault, ['Institution'], {
                conditions
            });

            expect(fileProperty.conditions).toHaveLength(2);
            expect(fileProperty.conditions).toEqual(conditions);
        });
    });

    describe('handleIconClick', () => {
        test('should pass conditions to selectFile', async () => {
            const conditions: Condition[] = [
                { property: 'status', type: 'equals', value: 'active' }
            ];

            const fileProperty = new FileProperty('institution', vault, ['Institution'], {
                conditions
            });

            const mockSelectedFile = {
                getLink: jest.fn().mockReturnValue('[[TestInstitution]]'),
                getPath: jest.fn().mockReturnValue('TestInstitution.md')
            };

            app.selectFile = jest.fn().mockResolvedValue(mockSelectedFile);
            
            const mockUpdate = jest.fn();
            const mockEvent = {
                target: document.createElement('div')
            } as any;

            await fileProperty.handleIconClick(mockUpdate, mockEvent);

            expect(app.selectFile).toHaveBeenCalledWith(
                vault,
                ['Institution'],
                expect.objectContaining({
                    validationFunction: expect.any(Function)
                })
            );
        });

        test('should pass undefined conditions when not set', async () => {
            const fileProperty = new FileProperty('institution', vault, ['Institution']);

            const mockSelectedFile = {
                getLink: jest.fn().mockReturnValue('[[TestInstitution]]'),
                getPath: jest.fn().mockReturnValue('TestInstitution.md')
            };

            app.selectFile = jest.fn().mockResolvedValue(mockSelectedFile);
            
            const mockUpdate = jest.fn();
            const mockEvent = {
                target: document.createElement('div')
            } as any;

            await fileProperty.handleIconClick(mockUpdate, mockEvent);

            expect(app.selectFile).toHaveBeenCalledWith(
                vault,
                ['Institution'],
                expect.objectContaining({
                    validationFunction: undefined
                })
            );
        });

        test('should work with complex conditions', async () => {
            const conditions: Condition[] = [
                { property: 'status', type: 'equals', value: 'active' },
                { property: 'type', type: 'notEquals', value: 'archived' },
                { property: 'population', type: 'greaterThan', value: 10000 }
            ];

            const fileProperty = new FileProperty('lieu', vault, ['Lieu'], {
                conditions
            });

            const mockSelectedFile = {
                getLink: jest.fn().mockReturnValue('[[Paris]]'),
                getPath: jest.fn().mockReturnValue('Paris.md')
            };

            app.selectFile = jest.fn().mockResolvedValue(mockSelectedFile);
            
            const mockUpdate = jest.fn();
            const mockEvent = {
                target: document.createElement('div')
            } as any;

            await fileProperty.handleIconClick(mockUpdate, mockEvent);

            expect(app.selectFile).toHaveBeenCalledWith(
                vault,
                ['Lieu'],
                expect.objectContaining({
                    validationFunction: expect.any(Function)
                })
            );
        });

        test('should handle isEmpty condition', async () => {
            const conditions: Condition[] = [
                { property: 'description', type: 'isEmpty' }
            ];

            const fileProperty = new FileProperty('parent', vault, ['Lieu'], {
                conditions
            });

            const mockSelectedFile = {
                getLink: jest.fn().mockReturnValue('[[TestLieu]]'),
                getPath: jest.fn().mockReturnValue('TestLieu.md')
            };

            app.selectFile = jest.fn().mockResolvedValue(mockSelectedFile);
            
            const mockUpdate = jest.fn();
            const mockEvent = {
                target: document.createElement('div')
            } as any;

            await fileProperty.handleIconClick(mockUpdate, mockEvent);

            expect(app.selectFile).toHaveBeenCalledWith(
                vault,
                ['Lieu'],
                expect.objectContaining({
                    validationFunction: expect.any(Function)
                })
            );
        });

        test('should handle isNotEmpty condition', async () => {
            const conditions: Condition[] = [
                { property: 'email', type: 'isNotEmpty' }
            ];

            const fileProperty = new FileProperty('contact', vault, ['Personne'], {
                conditions
            });

            const mockSelectedFile = {
                getLink: jest.fn().mockReturnValue('[[TestPersonne]]'),
                getPath: jest.fn().mockReturnValue('TestPersonne.md')
            };

            app.selectFile = jest.fn().mockResolvedValue(mockSelectedFile);
            
            const mockUpdate = jest.fn();
            const mockEvent = {
                target: document.createElement('div')
            } as any;

            await fileProperty.handleIconClick(mockUpdate, mockEvent);

            expect(app.selectFile).toHaveBeenCalledWith(
                vault,
                ['Personne'],
                expect.objectContaining({
                    validationFunction: expect.any(Function)
                })
            );
        });
    });

    describe('Integration with other properties', () => {
        test('should preserve icon and tooltip with conditions', () => {
            const conditions: Condition[] = [
                { property: 'status', type: 'equals', value: 'active' }
            ];

            const fileProperty = new FileProperty('institution', vault, ['Institution'], {
                icon: '🏢',
                tooltip: 'Select active institution',
                conditions
            });

            expect(fileProperty.icon).toBe('🏢');
            expect(fileProperty.tooltip).toBe('Select active institution');
            expect(fileProperty.conditions).toEqual(conditions);
        });

        test('should work with aliases and conditions', () => {
            const conditions: Condition[] = [
                { property: 'type', type: 'equals', value: 'Commune' }
            ];

            const fileProperty = new FileProperty('lieu', vault, ['Lieu'], {
                aliases: ['location', 'place'],
                conditions
            });

            expect(fileProperty.aliases).toEqual(['location', 'place']);
            expect(fileProperty.conditions).toEqual(conditions);
        });
    });
});
