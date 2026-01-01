/**
 * @jest-environment jsdom
 */

import { ConditionManager } from '../../src/Config/ConditionManager';
import { Classe } from '../../src/vault/Classe';
import { ConditionGroup, ConditionConfig } from '../../src/Config/ConditionManager';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('ConditionManager - Hierarchical Conditions', () => {
    let conditionManager: ConditionManager;
    let mockClasse: Classe;
    let vault: Vault;

    beforeEach(() => {
        conditionManager = new ConditionManager();
        const app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        
        // Create a more complete mock Classe instance
        mockClasse = {
            name: 'Test',
            status: 'active',
            category: 'important',
            priority: 5,
            tags: ['work', 'urgent'],
            date: new Date('2024-01-15'),
            getMetadata: jest.fn().mockImplementation((key: string) => {
                const data: any = {
                    name: 'Test',
                    status: 'active',
                    category: 'important',
                    priority: 5,
                    tags: ['work', 'urgent'],
                    date: new Date('2024-01-15')
                };
                return data[key];
            }),
            getProperty: jest.fn().mockImplementation((propertyName: string) => ({
                read: jest.fn().mockImplementation(() => {
                    const data: any = {
                        name: 'Test',
                        status: 'active',
                        category: 'important',
                        priority: 5,
                        tags: ['work', 'urgent'],
                        date: new Date('2024-01-15')
                    };
                    return Promise.resolve(data[propertyName]);
                })
            })),
            parent: null,
            children: []
        } as any;
    });

    describe('evaluateConditionGroup - Basic Groups', () => {
        it('should evaluate AND group with all true conditions', async () => {
            const group: ConditionGroup = {
                operator: 'AND',
                conditions: [
                    { property: 'status', type: 'equals', value: 'active' },
                    { property: 'priority', type: 'greaterThan', value: 3 }
                ]
            };

            const result = await conditionManager.evaluateConditionGroup(group, mockClasse);
            expect(result).toBe(true);
        });

        it('should evaluate AND group with one false condition', async () => {
            const group: ConditionGroup = {
                operator: 'AND',
                conditions: [
                    { property: 'status', type: 'equals', value: 'active' },
                    { property: 'priority', type: 'lessThan', value: 3 }
                ]
            };

            const result = await conditionManager.evaluateConditionGroup(group, mockClasse);
            expect(result).toBe(false);
        });

        it('should evaluate OR group with one true condition', async () => {
            const group: ConditionGroup = {
                operator: 'OR',
                conditions: [
                    { property: 'status', type: 'equals', value: 'inactive' },
                    { property: 'priority', type: 'greaterThan', value: 3 }
                ]
            };

            const result = await conditionManager.evaluateConditionGroup(group, mockClasse);
            expect(result).toBe(true);
        });

        it('should evaluate OR group with all false conditions', async () => {
            const group: ConditionGroup = {
                operator: 'OR',
                conditions: [
                    { property: 'status', type: 'equals', value: 'inactive' },
                    { property: 'priority', type: 'lessThan', value: 3 }
                ]
            };

            const result = await conditionManager.evaluateConditionGroup(group, mockClasse);
            expect(result).toBe(false);
        });
    });

    describe('evaluateConditionGroup - NOT Operator', () => {
        it('should apply NOT to AND group result', async () => {
            const group: ConditionGroup = {
                operator: 'AND',
                not: true,
                conditions: [
                    { property: 'status', type: 'equals', value: 'active' },
                    { property: 'priority', type: 'greaterThan', value: 3 }
                ]
            };

            const result = await conditionManager.evaluateConditionGroup(group, mockClasse);
            expect(result).toBe(false); // NOT true = false
        });

        it('should apply NOT to OR group result', async () => {
            const group: ConditionGroup = {
                operator: 'OR',
                not: true,
                conditions: [
                    { property: 'status', type: 'equals', value: 'inactive' },
                    { property: 'priority', type: 'lessThan', value: 3 }
                ]
            };

            const result = await conditionManager.evaluateConditionGroup(group, mockClasse);
            expect(result).toBe(true); // NOT false = true
        });
    });

    describe('evaluateConditionGroup - Nested Groups', () => {
        it('should evaluate nested AND groups', async () => {
            const group: ConditionGroup = {
                operator: 'AND',
                conditions: [
                    { property: 'status', type: 'equals', value: 'active' }
                ],
                groups: [
                    {
                        operator: 'OR',
                        conditions: [
                            { property: 'category', type: 'equals', value: 'important' },
                            { property: 'priority', type: 'greaterThan', value: 8 }
                        ]
                    }
                ]
            };

            const result = await conditionManager.evaluateConditionGroup(group, mockClasse);
            expect(result).toBe(true); // status=active AND (category=important OR priority>8)
        });

        it('should evaluate complex nested groups', async () => {
            const group: ConditionGroup = {
                operator: 'OR',
                groups: [
                    {
                        operator: 'AND',
                        conditions: [
                            { property: 'status', type: 'equals', value: 'inactive' },
                            { property: 'priority', type: 'lessThan', value: 3 }
                        ]
                    },
                    {
                        operator: 'AND',
                        conditions: [
                            { property: 'category', type: 'equals', value: 'important' },
                            { property: 'priority', type: 'greaterThan', value: 3 }
                        ]
                    }
                ]
            };

            const result = await conditionManager.evaluateConditionGroup(group, mockClasse);
            expect(result).toBe(true); // Second AND group should be true
        });

        it('should handle deeply nested groups', async () => {
            const group: ConditionGroup = {
                operator: 'AND',
                conditions: [
                    { property: 'status', type: 'equals', value: 'active' }
                ],
                groups: [
                    {
                        operator: 'OR',
                        groups: [
                            {
                                operator: 'AND',
                                conditions: [
                                    { property: 'category', type: 'equals', value: 'unimportant' },
                                    { property: 'priority', type: 'lessThan', value: 2 }
                                ]
                            },
                            {
                                operator: 'AND',
                                conditions: [
                                    { property: 'category', type: 'equals', value: 'important' },
                                    { property: 'priority', type: 'greaterThan', value: 3 }
                                ]
                            }
                        ]
                    }
                ]
            };

            const result = await conditionManager.evaluateConditionGroup(group, mockClasse);
            expect(result).toBe(true);
        });
    });

    describe('evaluateConditionConfig - Entry Point', () => {
        it('should handle backward compatibility with condition array', async () => {
            const config: any = [
                { property: 'status', type: 'equals', value: 'active' },
                { property: 'priority', type: 'greaterThan', value: 3 }
            ];

            const result = await conditionManager.evaluateConditionConfig(config, mockClasse);
            expect(result).toBe(true);
        });

        it('should handle single condition', async () => {
            const config = { property: 'status', type: 'equals', value: 'active' };

            const result = await conditionManager.evaluateConditionConfig(config as any, mockClasse);
            expect(result).toBe(true);
        });

        it('should handle condition group', async () => {
            const config: ConditionGroup = {
                operator: 'OR',
                conditions: [
                    { property: 'status', type: 'equals', value: 'inactive' },
                    { property: 'priority', type: 'greaterThan', value: 3 }
                ]
            };

            const result = await conditionManager.evaluateConditionConfig(config, mockClasse);
            expect(result).toBe(true);
        });

        it('should handle mixed format with conditions and groups', async () => {
            const config = {
                conditions: [
                    { property: 'status', type: 'equals', value: 'active' }
                ],
                groups: [
                    {
                        operator: 'OR',
                        conditions: [
                            { property: 'category', type: 'equals', value: 'important' },
                            { property: 'priority', type: 'greaterThan', value: 8 }
                        ]
                    }
                ]
            };

            const result = await conditionManager.evaluateConditionConfig(config as any, mockClasse);
            expect(result).toBe(true);
        });
    });

    describe('Individual Condition NOT Support', () => {
        it('should apply NOT to individual condition', async () => {
            const group: ConditionGroup = {
                operator: 'AND',
                conditions: [
                    { property: 'status', type: 'equals', value: 'active', not: true },
                    { property: 'priority', type: 'greaterThan', value: 3 }
                ]
            };

            const result = await conditionManager.evaluateConditionGroup(group, mockClasse);
            expect(result).toBe(false); // NOT(status=active) AND priority>3 = false AND true = false
        });

        it('should combine individual NOT with group logic', async () => {
            const group: ConditionGroup = {
                operator: 'OR',
                conditions: [
                    { property: 'status', type: 'equals', value: 'active', not: true }, // false
                    { property: 'category', type: 'equals', value: 'important' } // true
                ]
            };

            const result = await conditionManager.evaluateConditionGroup(group, mockClasse);
            expect(result).toBe(true); // false OR true = true
        });
    });

    describe('createHierarchicalValidationFunction', () => {
        it('should create a validation function for hierarchical conditions', async () => {
            const config: ConditionGroup = {
                operator: 'AND',
                conditions: [
                    { property: 'status', type: 'equals', value: 'active' },
                    { property: 'priority', type: 'greaterThan', value: 3 }
                ]
            };

            const validationFn = conditionManager.createHierarchicalValidationFunction(config);
            const result = await validationFn(mockClasse);
            expect(result).toBe(true);
        });

        it('should work with backward compatible format', async () => {
            const config = [
                { property: 'status', type: 'equals', value: 'active' },
                { property: 'priority', type: 'greaterThan', value: 3 }
            ];

            const validationFn = conditionManager.createHierarchicalValidationFunction(config as any);
            const result = await validationFn(mockClasse);
            expect(result).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty group', async () => {
            const group: ConditionGroup = {
                operator: 'AND',
                conditions: [],
                groups: []
            };

            const result = await conditionManager.evaluateConditionGroup(group, mockClasse);
            expect(result).toBe(true); // Empty group should be true
        });

        it('should handle empty group with NOT', async () => {
            const group: ConditionGroup = {
                operator: 'AND',
                not: true,
                conditions: [],
                groups: []
            };

            const result = await conditionManager.evaluateConditionGroup(group, mockClasse);
            expect(result).toBe(false); // NOT true = false
        });

        it('should handle group with only nested groups', async () => {
            const group: ConditionGroup = {
                operator: 'OR',
                groups: [
                    {
                        operator: 'AND',
                        conditions: [
                            { property: 'status', type: 'equals', value: 'active' }
                        ]
                    }
                ]
            };

            const result = await conditionManager.evaluateConditionGroup(group, mockClasse);
            expect(result).toBe(true);
        });

        it('should default to AND operator when not specified', async () => {
            const group: ConditionGroup = {
                // operator not specified, should default to AND
                conditions: [
                    { property: 'status', type: 'equals', value: 'active' },
                    { property: 'priority', type: 'greaterThan', value: 3 }
                ]
            };

            const result = await conditionManager.evaluateConditionGroup(group, mockClasse);
            expect(result).toBe(true);
        });
    });

    describe('Complex Real-World Scenarios', () => {
        it('should handle complex business logic conditions', async () => {
            // (status = active AND priority > 3) OR (category = important AND tags contains urgent)
            const config: ConditionGroup = {
                operator: 'OR',
                groups: [
                    {
                        operator: 'AND',
                        conditions: [
                            { property: 'status', type: 'equals', value: 'active' },
                            { property: 'priority', type: 'greaterThan', value: 3 }
                        ]
                    },
                    {
                        operator: 'AND',
                        conditions: [
                            { property: 'category', type: 'equals', value: 'important' },
                            { property: 'tags', type: 'contains', value: 'urgent' }
                        ]
                    }
                ]
            };

            const result = await conditionManager.evaluateConditionConfig(config, mockClasse);
            expect(result).toBe(true); // Both groups should be true, so OR result is true
        });

        it('should handle exclusion logic with NOT groups', async () => {
            // Include items that are active BUT NOT (low priority AND unimportant)
            const config: ConditionGroup = {
                operator: 'AND',
                conditions: [
                    { property: 'status', type: 'equals', value: 'active' }
                ],
                groups: [
                    {
                        operator: 'AND',
                        not: true, // NOT group
                        conditions: [
                            { property: 'priority', type: 'lessThan', value: 3 },
                            { property: 'category', type: 'equals', value: 'unimportant' }
                        ]
                    }
                ]
            };

            const result = await conditionManager.evaluateConditionConfig(config, mockClasse);
            expect(result).toBe(true); // status=active AND NOT(priority<3 AND category=unimportant)
        });

        it('should handle mixed individual and group NOT operations', async () => {
            const config: ConditionGroup = {
                operator: 'OR',
                conditions: [
                    { property: 'status', type: 'equals', value: 'inactive', not: true } // NOT inactive = true (since status is active)
                ],
                groups: [
                    {
                        operator: 'AND',
                        not: true, // NOT group
                        conditions: [
                            { property: 'priority', type: 'lessThan', value: 10 }, // true
                            { property: 'category', type: 'equals', value: 'unimportant' } // false
                        ]
                    } // NOT(true AND false) = NOT(false) = true
                ]
            };

            const result = await conditionManager.evaluateConditionConfig(config, mockClasse);
            expect(result).toBe(true); // true OR true = true
        });
    });
});
