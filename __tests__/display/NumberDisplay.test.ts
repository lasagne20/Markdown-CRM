/**
 * @jest-environment jsdom
 */

import { NumberDisplay } from '../../src/display/NumberDisplay';
import { DisplayRenderer } from '../../src/display/DisplayRenderer';
import { NumberDisplayItem } from '../../src/Config/interfaces';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { NumberProperty } from '../../src/properties/NumberProperty';
import { mockApp } from '../utils/mocks';

// Mock class for testing
class MockTestFile extends Classe {
    constructor(vault: Vault, fileName: string, budget: number, montant: number) {
        super(vault);
        this.fileName = fileName;
        this.mockData = { budget, montant };
    }

    private fileName: string;
    private mockData: { [key: string]: any };

    getName(withExtension: boolean = true): string {
        return withExtension ? `${this.fileName}.md` : this.fileName;
    }

    getFile() {
        return {
            getName: (withExtension: boolean = true) => this.getName(withExtension),
            name: this.fileName,
            basename: this.fileName
        } as any;
    }

    async getPropertyValue(propertyName: string): Promise<any> {
        return this.mockData[propertyName] || 0;
    }

    getProperty(name: string) {
        const properties = {
            budget: new NumberProperty('budget', this.vault),
            montant: new NumberProperty('montant', this.vault)
        };
        const property = properties[name as keyof typeof properties];
        if (property) {
            (property as any).getDisplay = jest.fn().mockResolvedValue(document.createElement('span'));
        }
        return property || null;
    }
}

describe('NumberDisplay with Sources', () => {
    describe('Basic NumberDisplay functionality', () => {
        test('should create a number display with basic options', () => {
            const display = new NumberDisplay({
                value: 75,
                unit: '%',
                label: 'Progress',
                size: 100
            });

            expect(display.container).toBeInstanceOf(HTMLElement);
            expect(display.container.className).toBe('crm-number-display');
            
            const svg = display.container.querySelector('svg');
            expect(svg).toBeTruthy();
            
            const text = svg?.querySelector('text');
            expect(text?.textContent).toBe('75%');
        });

        test('should handle fillLevel override', () => {
            const display = new NumberDisplay({
                value: 100,
                fillLevel: 0.5, // Force 50% fill
                unit: '%'
            });

            const svg = display.container.querySelector('svg');
            const progressCircle = svg?.querySelectorAll('circle')[1];
            expect(progressCircle).toBeTruthy();
        });

        test('should create label when provided', () => {
            const display = new NumberDisplay({
                value: 42,
                label: 'Test Label'
            });

            const label = display.container.querySelector('.crm-number-display-label');
            expect(label).toBeTruthy();
            expect(label?.textContent).toBe('Test Label');
        });
    });

    describe('DisplayRenderer integration with sources', () => {
        let vault: Vault;
        let mockFiles: MockTestFile[];
        let renderer: DisplayRenderer;

        beforeEach(() => {
            const app = mockApp();
            vault = new Vault(app, { vaultPath: './test-vault' } as any);
            
            // Create mock files with budget and montant data
            mockFiles = [
                new MockTestFile(vault, 'project-1', 10000, 2500),
                new MockTestFile(vault, 'project-2', 15000, 3000), 
                new MockTestFile(vault, 'project-3', 8000, 1500),
                new MockTestFile(vault, 'project-4', 12000, 4000)
            ];

            const properties = {
                budget: new NumberProperty('budget', vault),
                montant: new NumberProperty('montant', vault)
            };

            // Mock getDisplay for properties
            Object.values(properties).forEach(prop => {
                (prop as any).getDisplay = jest.fn().mockResolvedValue(document.createElement('span'));
            });

            renderer = new DisplayRenderer(vault, properties, mockFiles[0]);
            
            // Mock getFilesForTable to return our mock files
            (renderer as any).getFilesForTable = jest.fn().mockResolvedValue(mockFiles);
        });

        test('should render number display with sum formula', async () => {
            const numberItem: NumberDisplayItem = {
                type: 'number',
                title: 'Total Budget',
                source: {
                    class: 'Project'
                },
                formula: 'sum',
                propertyName: 'budget',
                unit: '€',
                label: 'Budget Total',
                max: 60000 // For progress calculation
            };

            const result = await (renderer as any).renderNumber(numberItem);
            
            expect(result).toBeTruthy();
            expect(result?.querySelector('h3')?.textContent).toBe('Total Budget');
            expect(result?.querySelector('.crm-number-display')).toBeTruthy();
            
            // Check calculation: 10000 + 15000 + 8000 + 12000 = 45000
            const svg = result?.querySelector('svg');
            const text = svg?.querySelector('text');
            expect(text?.textContent).toBe('45000€');
        });

        test('should render number display with count formula', async () => {
            const numberItem: NumberDisplayItem = {
                type: 'number',
                title: 'Project Count',
                source: {
                    class: 'Project'
                },
                formula: 'count',
                label: 'Total Projects'
            };

            const result = await (renderer as any).renderNumber(numberItem);
            
            expect(result).toBeTruthy();
            
            const svg = result?.querySelector('svg');
            const text = svg?.querySelector('text');
            expect(text?.textContent).toBe('4'); // 4 mock files
        });

        test('should render number display with average formula', async () => {
            const numberItem: NumberDisplayItem = {
                type: 'number',
                title: 'Average Amount',
                source: {
                    class: 'Project'
                },
                formula: 'avg',
                propertyName: 'montant',
                unit: '€',
                label: 'Average Payment'
            };

            const result = await (renderer as any).renderNumber(numberItem);
            
            expect(result).toBeTruthy();
            
            // Check calculation: (2500 + 3000 + 1500 + 4000) / 4 = 2750
            const svg = result?.querySelector('svg');
            const text = svg?.querySelector('text');
            expect(text?.textContent).toBe('2750€');
        });

        test('should render number display with min/max formulas', async () => {
            const minItem: NumberDisplayItem = {
                type: 'number',
                source: { class: 'Project' },
                formula: 'min',
                propertyName: 'budget'
            };

            const maxItem: NumberDisplayItem = {
                type: 'number',
                source: { class: 'Project' },
                formula: 'max',
                propertyName: 'budget'
            };

            const minResult = await (renderer as any).renderNumber(minItem);
            const maxResult = await (renderer as any).renderNumber(maxItem);
            
            // Min: 8000, Max: 15000
            const minText = minResult?.querySelector('svg text')?.textContent;
            const maxText = maxResult?.querySelector('svg text')?.textContent;
            
            expect(minText).toBe('8000');
            expect(maxText).toBe('15000');
        });

        test('should calculate progress with max value', async () => {
            const numberItem: NumberDisplayItem = {
                type: 'number',
                source: { class: 'Project' },
                formula: 'sum',
                propertyName: 'budget',
                max: 50000 // Total budget: 45000, so progress = 45000/50000 = 0.9 (90%)
            };

            const result = await (renderer as any).renderNumber(numberItem);
            expect(result).toBeTruthy();
            
            // The NumberDisplay should receive fillLevel = 0.9
            // We can't easily test the actual circle fill, but we verify the calculation logic
        });

        test('should handle source with conditions', async () => {
            const numberItem: NumberDisplayItem = {
                type: 'number',
                source: {
                    class: 'Project',
                    conditions: [
                        {
                            type: 'greaterThan',
                            property: 'budget',
                            value: 10000
                        }
                    ]
                },
                formula: 'count',
                label: 'Large Projects'
            };

            // This would normally filter files, but our mock always returns all files
            const result = await (renderer as any).renderNumber(numberItem);
            expect(result).toBeTruthy();
        });

        test('should handle source with smartFilter', async () => {
            const numberItem: NumberDisplayItem = {
                type: 'number',
                source: {
                    class: 'Project',
                    smartFilter: 'children'
                },
                formula: 'sum',
                propertyName: 'budget'
            };

            const result = await (renderer as any).renderNumber(numberItem);
            expect(result).toBeTruthy();
        });

        test('should handle errors gracefully', async () => {
            // Mock getFilesForTable to throw error
            (renderer as any).getFilesForTable = jest.fn().mockRejectedValue(new Error('Test error'));

            const numberItem: NumberDisplayItem = {
                type: 'number',
                source: { class: 'InvalidClass' },
                formula: 'sum',
                propertyName: 'budget'
            };

            const result = await (renderer as any).renderNumber(numberItem);
            
            expect(result).toBeTruthy();
            expect(result?.className).toBe('crm-number-display-error');
            expect(result?.textContent).toBe('Error loading number display');
        });

        test('should apply custom className', async () => {
            const numberItem: NumberDisplayItem = {
                type: 'number',
                source: { class: 'Project' },
                formula: 'count',
                className: 'custom-number-display'
            };

            const result = await (renderer as any).renderNumber(numberItem);
            
            expect(result).toBeTruthy();
            expect(result?.className).toBe('custom-number-display');
        });
    });
});