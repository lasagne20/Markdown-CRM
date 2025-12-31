/**
 * @jest-environment jsdom
 */

import { ConditionManager, Condition } from '../../src/Config/ConditionManager';
import { Classe } from '../../src/vault/Classe';
import { DateProperty } from '../../src/properties/DateProperty';
import { RangeDateProperty } from '../../src/properties/RangeDateProperty';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('ConditionManager - DateProperty Integration', () => {
    let conditionManager: ConditionManager;
    let mockClasseInstance: Classe;
    let vault: Vault;
    let dateProperty: DateProperty;

    beforeEach(() => {
        conditionManager = new ConditionManager();
        const app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        
        // Create DateProperty
        dateProperty = new DateProperty('startDate', vault, ['today', 'tomorrow'], { icon: 'calendar' });
        
        // Create mock classe instance
        mockClasseInstance = {
            getProperty: jest.fn(),
            getName: jest.fn().mockReturnValue('TestClasse'),
            getPath: jest.fn().mockReturnValue('test/path/TestClasse.md'),
            getAllProperties: jest.fn().mockReturnValue({
                startDate: dateProperty
            })
        } as any;

        // Mock getProperty to return our date property
        (mockClasseInstance.getProperty as jest.Mock).mockImplementation((name: string) => {
            if (name === 'startDate') {
                return dateProperty;
            }
            return undefined;
        });
    });

    describe('Date Equality Conditions', () => {
        test('should handle equals condition with exact date match', async () => {
            // Setup: date property returns "2024-12-31"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-31');

            const condition: Condition = {
                property: 'startDate',
                type: 'equals',
                value: '2024-12-31'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle equals condition with date mismatch', async () => {
            // Setup: date property returns "2024-12-31"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-31');

            const condition: Condition = {
                property: 'startDate',
                type: 'equals',
                value: '2024-12-30'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(false);
        });

        test('should handle notEquals condition correctly', async () => {
            // Setup: date property returns "2024-12-31"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-31');

            const condition: Condition = {
                property: 'startDate',
                type: 'notEquals',
                value: '2024-12-30'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });
    });

    describe('Date Comparison Conditions', () => {
        test('should handle greaterThan condition with dates (as timestamp)', async () => {
            // Setup: date property returns "2024-12-31"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-31');

            // Convert dates to timestamps for comparison
            const condition: Condition = {
                property: 'startDate',
                type: 'greaterThan',
                value: new Date('2024-12-30').getTime()
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle lessThan condition with dates (as timestamp)', async () => {
            // Setup: date property returns "2024-12-30"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-30');

            const condition: Condition = {
                property: 'startDate',
                type: 'lessThan',
                value: new Date('2024-12-31').getTime()
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle greaterThanOrEqual condition with dates', async () => {
            // Setup: date property returns "2024-12-31"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-31');

            const condition: Condition = {
                property: 'startDate',
                type: 'greaterThanOrEqual',
                value: new Date('2024-12-31').getTime()
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle lessThanOrEqual condition with dates', async () => {
            // Setup: date property returns "2024-12-30"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-30');

            const condition: Condition = {
                property: 'startDate',
                type: 'lessThanOrEqual',
                value: new Date('2024-12-30').getTime()
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });
    });

    describe('Simplified Date Comparison Conditions', () => {
        test('should handle greaterThan condition with year string', async () => {
            // Setup: date property returns "2024-12-31"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-31');

            const condition: Condition = {
                property: 'startDate',
                type: 'greaterThan',
                value: '2023' // Just a year
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle lessThan condition with year string', async () => {
            // Setup: date property returns "2024-12-31"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-31');

            const condition: Condition = {
                property: 'startDate',
                type: 'lessThan',
                value: '2025' // Just a year
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle greaterThanOrEqual condition with date string', async () => {
            // Setup: date property returns "2024-12-31"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-31');

            const condition: Condition = {
                property: 'startDate',
                type: 'greaterThanOrEqual',
                value: '2024-12-31' // Date string
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle lessThanOrEqual condition with date string', async () => {
            // Setup: date property returns "2024-12-30"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-30');

            const condition: Condition = {
                property: 'startDate',
                type: 'lessThanOrEqual',
                value: '2024-12-31' // Date string
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle comparison with Date object', async () => {
            // Setup: date property returns "2024-12-31"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-31');

            const condition: Condition = {
                property: 'startDate',
                type: 'greaterThan',
                value: new Date('2024-12-30') // Date object (not timestamp)
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle year comparison correctly', async () => {
            // Setup: date property returns "2024-01-01"
            dateProperty.read = jest.fn().mockResolvedValue('2024-01-01');

            const condition: Condition = {
                property: 'startDate',
                type: 'greaterThanOrEqual',
                value: '2024' // Should match January 1st, 2024
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should fail year comparison when date is before year', async () => {
            // Setup: date property returns "2023-12-31"
            dateProperty.read = jest.fn().mockResolvedValue('2023-12-31');

            const condition: Condition = {
                property: 'startDate',
                type: 'greaterThanOrEqual',
                value: '2024' // Should be January 1st, 2024
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(false);
        });
    });

    describe('Date Array Conditions', () => {
        test('should handle equalsAny condition with array of dates', async () => {
            // Setup: date property returns "2024-12-31"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-31');

            const condition: Condition = {
                property: 'startDate',
                type: 'equalsAny',
                values: ['2024-12-30', '2024-12-31', '2025-01-01']
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle notEqualsAny condition with array of dates', async () => {
            // Setup: date property returns "2024-12-29"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-29');

            const condition: Condition = {
                property: 'startDate',
                type: 'notEqualsAny',
                values: ['2024-12-30', '2024-12-31', '2025-01-01']
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });
    });

    describe('Date Empty/NotEmpty Conditions', () => {
        test('should handle isEmpty condition with null date', async () => {
            // Setup: date property returns null
            dateProperty.read = jest.fn().mockResolvedValue(null);

            const condition: Condition = {
                property: 'startDate',
                type: 'isEmpty'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle isEmpty condition with empty string date', async () => {
            // Setup: date property returns empty string
            dateProperty.read = jest.fn().mockResolvedValue('');

            const condition: Condition = {
                property: 'startDate',
                type: 'isEmpty'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle isNotEmpty condition with valid date', async () => {
            // Setup: date property returns valid date
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-31');

            const condition: Condition = {
                property: 'startDate',
                type: 'isNotEmpty'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle isNotEmpty condition with empty date', async () => {
            // Setup: date property returns empty string
            dateProperty.read = jest.fn().mockResolvedValue('');

            const condition: Condition = {
                property: 'startDate',
                type: 'isNotEmpty'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(false);
        });
    });

    describe('Date Contains Conditions', () => {
        test('should handle contains condition with partial date match (year)', async () => {
            // Setup: date property returns "2024-12-31"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-31');

            const condition: Condition = {
                property: 'startDate',
                type: 'contains',
                value: '2024'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle contains condition with partial date match (month)', async () => {
            // Setup: date property returns "2024-12-31"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-31');

            const condition: Condition = {
                property: 'startDate',
                type: 'contains',
                value: '12'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle notContains condition correctly', async () => {
            // Setup: date property returns "2024-12-31"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-31');

            const condition: Condition = {
                property: 'startDate',
                type: 'notContains',
                value: '2025'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });
    });

    describe('Multiple Date Conditions', () => {
        test('should handle multiple conditions with AND logic', async () => {
            // Setup: date property returns "2024-12-31"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-31');

            const conditions: Condition[] = [
                {
                    property: 'startDate',
                    type: 'contains',
                    value: '2024'
                },
                {
                    property: 'startDate',
                    type: 'contains',
                    value: '12'
                },
                {
                    property: 'startDate',
                    type: 'isNotEmpty'
                }
            ];

            const result = await conditionManager.evaluateConditions(conditions, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should fail when any condition in AND logic fails', async () => {
            // Setup: date property returns "2024-12-31"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-31');

            const conditions: Condition[] = [
                {
                    property: 'startDate',
                    type: 'contains',
                    value: '2024'
                },
                {
                    property: 'startDate',
                    type: 'contains',
                    value: '2025' // This will fail
                }
            ];

            const result = await conditionManager.evaluateConditions(conditions, mockClasseInstance);
            expect(result).toBe(false);
        });
    });

    describe('createValidationFunction with DateProperty', () => {
        test('should create validation function that works with date conditions', async () => {
            // Setup: date property returns "2024-12-31"
            dateProperty.read = jest.fn().mockResolvedValue('2024-12-31');

            const conditions: Condition[] = [
                {
                    property: 'startDate',
                    type: 'contains',
                    value: '2024'
                }
            ];

            const validationFn = conditionManager.createValidationFunction(conditions);
            const result = await validationFn(mockClasseInstance);

            expect(result).toBe(true);
        });

        test('should create validation function that rejects invalid dates', async () => {
            // Setup: date property returns "2023-12-31"
            dateProperty.read = jest.fn().mockResolvedValue('2023-12-31');

            const conditions: Condition[] = [
                {
                    property: 'startDate',
                    type: 'contains',
                    value: '2024'
                }
            ];

            const validationFn = conditionManager.createValidationFunction(conditions);
            const result = await validationFn(mockClasseInstance);

            expect(result).toBe(false);
        });
    });
});

describe('ConditionManager - RangeDateProperty Integration', () => {
    let conditionManager: ConditionManager;
    let mockClasseInstance: Classe;
    let vault: Vault;
    let rangeDateProperty: RangeDateProperty;

    beforeEach(() => {
        conditionManager = new ConditionManager();
        const app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        
        // Create RangeDateProperty
        rangeDateProperty = new RangeDateProperty('eventDate', vault, { icon: 'calendar' });
        
        // Create mock classe instance
        mockClasseInstance = {
            getProperty: jest.fn(),
            getName: jest.fn().mockReturnValue('TestEvent'),
            getPath: jest.fn().mockReturnValue('test/path/TestEvent.md'),
            getAllProperties: jest.fn().mockReturnValue({
                eventDate: rangeDateProperty
            })
        } as any;

        // Mock getProperty to return our range date property
        (mockClasseInstance.getProperty as jest.Mock).mockImplementation((name: string) => {
            if (name === 'eventDate') {
                return rangeDateProperty;
            }
            return undefined;
        });
    });

    describe('Range Date Equality Conditions', () => {
        test('should handle equals condition with single date in range format', async () => {
            // Setup: range date property returns "2024-12-31"
            rangeDateProperty.read = jest.fn().mockResolvedValue('2024-12-31');

            const condition: Condition = {
                property: 'eventDate',
                type: 'equals',
                value: '2024-12-31'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle equals condition with date range', async () => {
            // Setup: range date property returns "2024-12-31 to 2025-01-02"
            rangeDateProperty.read = jest.fn().mockResolvedValue('2024-12-31 to 2025-01-02');

            const condition: Condition = {
                property: 'eventDate',
                type: 'equals',
                value: '2024-12-31 to 2025-01-02'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });
    });

    describe('Range Date Contains Conditions', () => {
        test('should handle contains condition with start date', async () => {
            // Setup: range date property returns "2024-12-31 to 2025-01-02"
            rangeDateProperty.read = jest.fn().mockResolvedValue('2024-12-31 to 2025-01-02');

            const condition: Condition = {
                property: 'eventDate',
                type: 'contains',
                value: '2024-12-31'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle contains condition with end date', async () => {
            // Setup: range date property returns "2024-12-31 to 2025-01-02"
            rangeDateProperty.read = jest.fn().mockResolvedValue('2024-12-31 to 2025-01-02');

            const condition: Condition = {
                property: 'eventDate',
                type: 'contains',
                value: '2025-01-02'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle contains condition with year', async () => {
            // Setup: range date property returns "2024-12-31 to 2025-01-02"
            rangeDateProperty.read = jest.fn().mockResolvedValue('2024-12-31 to 2025-01-02');

            const condition: Condition = {
                property: 'eventDate',
                type: 'contains',
                value: '2024'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle notContains condition correctly', async () => {
            // Setup: range date property returns "2024-12-31 to 2025-01-02"
            rangeDateProperty.read = jest.fn().mockResolvedValue('2024-12-31 to 2025-01-02');

            const condition: Condition = {
                property: 'eventDate',
                type: 'notContains',
                value: '2023'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });
    });

    describe('Range Date Empty/NotEmpty Conditions', () => {
        test('should handle isEmpty condition with empty range date', async () => {
            // Setup: range date property returns empty string
            rangeDateProperty.read = jest.fn().mockResolvedValue('');

            const condition: Condition = {
                property: 'eventDate',
                type: 'isEmpty'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });

        test('should handle isNotEmpty condition with valid range date', async () => {
            // Setup: range date property returns a range
            rangeDateProperty.read = jest.fn().mockResolvedValue('2024-12-31 to 2025-01-02');

            const condition: Condition = {
                property: 'eventDate',
                type: 'isNotEmpty'
            };

            const result = await conditionManager.evaluateCondition(condition, mockClasseInstance);
            expect(result).toBe(true);
        });
    });

    describe('Range Date Multiple Conditions', () => {
        test('should handle multiple conditions on range dates', async () => {
            // Setup: range date property returns "2024-12-31 to 2025-01-02"
            rangeDateProperty.read = jest.fn().mockResolvedValue('2024-12-31 to 2025-01-02');

            const conditions: Condition[] = [
                {
                    property: 'eventDate',
                    type: 'isNotEmpty'
                },
                {
                    property: 'eventDate',
                    type: 'contains',
                    value: '2024'
                },
                {
                    property: 'eventDate',
                    type: 'contains',
                    value: 'to'
                }
            ];

            const result = await conditionManager.evaluateConditions(conditions, mockClasseInstance);
            expect(result).toBe(true);
        });
    });
});