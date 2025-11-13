import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';
import { FormulaProperty } from '../../src/properties/FormulaProperty';

// Mock des dépendances
jest.mock('../../src/vault/Classe');
jest.mock('../../src/vault/Vault');

describe('FormulaProperty', () => {
    let formulaProperty: FormulaProperty;
    let mockFile: jest.Mocked<Classe>;
    let mockVault: jest.Mocked<Vault>;

    beforeEach(() => {
        // Configuration des mocks
        mockVault = {
            getName: jest.fn().mockReturnValue('TestVault'),
            app: {
                vault: {
                    getName: jest.fn().mockReturnValue('TestVault')
                },
                setIcon: jest.fn((element: HTMLElement, iconName: string) => {
                    element.setAttribute('data-icon', iconName);
                    element.textContent = `[${iconName}]`;
                }),
                getUrl: jest.fn((filePath: string) => {
                    return `obsidian://open?vault=TestVault&file=${encodeURIComponent(filePath)}`;
                })
            },
            readLinkFile: jest.fn()
        } as any;

        mockFile = {
            vault: mockVault,
            getName: jest.fn(),
            getAllProperties: jest.fn(),
            getPropertyValue: jest.fn(),
            updateMetadata: jest.fn(),
            updatePropertyValue: jest.fn(),
            getVault: jest.fn().mockReturnValue(mockVault)
        } as any;

        // Reset des mocks
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should create formula property with default arguments', () => {
            formulaProperty = new FormulaProperty('testFormula', mockVault, '1 + 1');
            
            expect(formulaProperty.name).toBe('testFormula');
            expect(formulaProperty.formula).toBe('1 + 1');
            expect(formulaProperty.type).toBe('formula');
            expect(formulaProperty.write).toBe(false);
            expect(formulaProperty.static).toBe(true);
        });

        test('should create formula property with custom arguments', () => {
            formulaProperty = new FormulaProperty('testFormula', mockVault, '2 * 3', {
                icon: 'calculator',
                static: false,
                write: true
            });
            
            expect(formulaProperty.name).toBe('testFormula');
            expect(formulaProperty.formula).toBe('2 * 3');
            expect(formulaProperty.type).toBe('formula');
            expect(formulaProperty.write).toBe(true);
            expect(formulaProperty.static).toBe(false);
            expect(formulaProperty.icon).toBe('calculator');
        });

        test('should handle partial arguments', () => {
            formulaProperty = new FormulaProperty('testFormula', mockVault, 'x + y', {
                icon: 'math',
                write: true
                // static will use default value from FormulaProperty constructor (true)
            });
            
            expect(formulaProperty.write).toBe(true);
            // La valeur sera false car LinkProperty n'override pas le default de Property
            expect(formulaProperty.static).toBe(false);
            expect(formulaProperty.icon).toBe('math');
        });
    });

    describe('validate', () => {
        beforeEach(() => {
            formulaProperty = new FormulaProperty('test', mockVault, '1 + 1');
        });

        test('should return input value unchanged', () => {
            expect(formulaProperty.validate('test')).toBe('test');
            expect(formulaProperty.validate('123')).toBe('123');
            expect(formulaProperty.validate('')).toBe('');
        });
    });

    describe('read', () => {
        beforeEach(() => {
            formulaProperty = new FormulaProperty('totalFormula', mockVault, 'price * quantity');
            
            // Mock des propriétés du fichier
            mockFile.getAllProperties.mockReturnValue({
                price: { name: 'price' } as any,
                quantity: { name: 'quantity' } as any,
                totalFormula: { name: 'totalFormula' } as any
            });
            
            mockFile.getName.mockReturnValue('TestFile');
        });

        test('should execute simple arithmetic formula', async () => {
            mockFile.getPropertyValue
                .mockImplementation(async (key: string) => {
                    if (key === 'price') return 10;
                    if (key === 'quantity') return 5;
                    return null;
                });

            const result = await formulaProperty.read(mockFile);
            expect(result).toBe(50);
        });

        test('should handle formula with return statement', async () => {
            const formulaWithReturn = new FormulaProperty('test', mockVault, 'return price + quantity');
            
            mockFile.getPropertyValue
                .mockImplementation(async (key: string) => {
                    if (key === 'price') return 15;
                    if (key === 'quantity') return 25;
                    return null;
                });

            const result = await formulaWithReturn.read(mockFile);
            expect(result).toBe(40);
        });

        test('should sanitize property names (remove spaces)', async () => {
            mockFile.getAllProperties.mockReturnValue({
                'unit price': { name: 'unit price' } as any,
                'item count': { name: 'item count' } as any,
                totalFormula: { name: 'totalFormula' } as any
            });

            mockFile.getPropertyValue
                .mockImplementation(async (key: string) => {
                    if (key === 'unit price') return 12;
                    if (key === 'item count') return 3;
                    return null;
                });

            const sanitizedFormula = new FormulaProperty('test', mockVault, 'unitprice * itemcount');
            const result = await sanitizedFormula.read(mockFile);
            expect(result).toBe(36);
        });

        test('should exclude self property from formula context', async () => {
            mockFile.getAllProperties.mockReturnValue({
                price: { name: 'price' } as any,
                totalFormula: { name: 'totalFormula' } as any
            });

            mockFile.getPropertyValue
                .mockImplementation(async (key: string) => {
                    if (key === 'price') return 100;
                    if (key === 'totalFormula') return 999; // Should be excluded
                    return null;
                });

            const selfExcludingFormula = new FormulaProperty('totalFormula', mockVault, 'price * 2');
            const result = await selfExcludingFormula.read(mockFile);
            expect(result).toBe(200);
        });

        test('should handle formula errors gracefully (ReferenceError)', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            mockFile.getPropertyValue.mockResolvedValue(null);
            
            const faultyFormula = new FormulaProperty('test', mockVault, 'undefinedVariable * 5');
            const result = await faultyFormula.read(mockFile);
            
            expect(result).toBeNull();
            // Test simple que console.error a été appelé avec le bon message
            expect(consoleSpy).toHaveBeenCalled();
            const errorCall = consoleSpy.mock.calls[0];
            expect(errorCall[0]).toContain('Formula error : undefinedVariable * 5');
            expect(errorCall[0]).toContain('This is all the properties available');
            
            consoleSpy.mockRestore();
        });

        test('should handle general formula errors', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            mockFile.getPropertyValue.mockResolvedValue(null);
            
            const faultyFormula = new FormulaProperty('test', mockVault, 'throw new Error("test error")');
            const result = await faultyFormula.read(mockFile);
            
            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Formula error : throw new Error("test error")')
            );
            
            consoleSpy.mockRestore();
        });

        describe('write functionality', () => {
            test('should update metadata when write is true and value changed', async () => {
                const writeFormula = new FormulaProperty('total', mockVault, 'price + tax', {
                    icon: '',
                    write: true
                });

                // Mock getAllProperties pour cette instance
                mockFile.getAllProperties.mockReturnValue({
                    price: { name: 'price' } as any,
                    tax: { name: 'tax' } as any,
                    total: { name: 'total' } as any
                });

                mockFile.getPropertyValue
                    .mockImplementation(async (key: string) => {
                        if (key === 'price') return 100;
                        if (key === 'tax') return 20;
                        if (key === 'total') return 110; // Old value
                        return null;
                    });

                const result = await writeFormula.read(mockFile);
                
                expect(result).toBe(120);
                expect(mockFile.updatePropertyValue).toHaveBeenCalledWith('total', 120);
            });

            test('should not update metadata when write is true but value unchanged', async () => {
                const writeFormula = new FormulaProperty('total', mockVault, 'price + tax', {
                    icon: '',
                    write: true
                });

                // Mock getAllProperties pour cette instance
                mockFile.getAllProperties.mockReturnValue({
                    price: { name: 'price' } as any,
                    tax: { name: 'tax' } as any,
                    total: { name: 'total' } as any
                });

                mockFile.getPropertyValue
                    .mockImplementation(async (key: string) => {
                        if (key === 'price') return 100;
                        if (key === 'tax') return 20;
                        if (key === 'total') return 120; // Same as calculated
                        return null;
                    });

                const result = await writeFormula.read(mockFile);
                
                expect(result).toBe(120);
                expect(mockFile.updatePropertyValue).not.toHaveBeenCalled();
            });

            test('should not update metadata when write is false', async () => {
                const readOnlyFormula = new FormulaProperty('total', mockVault, 'price + tax', {
                    icon: '',
                    write: false
                });

                // Mock getAllProperties pour cette instance
                mockFile.getAllProperties.mockReturnValue({
                    price: { name: 'price' } as any,
                    tax: { name: 'tax' } as any,
                    total: { name: 'total' } as any
                });

                mockFile.getPropertyValue
                    .mockImplementation(async (key: string) => {
                        if (key === 'price') return 100;
                        if (key === 'tax') return 20;
                        return null;
                    });

                const result = await readOnlyFormula.read(mockFile);
                
                expect(result).toBe(120);
                expect(mockFile.updatePropertyValue).not.toHaveBeenCalled();
            });
        });
    });

    describe('getPretty', () => {
        beforeEach(() => {
            formulaProperty = new FormulaProperty('test', mockVault, '1 + 1');
        });

        test('should return input if falsy', () => {
            expect(formulaProperty.getPretty('')).toBe('');
            expect(formulaProperty.getPretty(null as any)).toBe(null);
            expect(formulaProperty.getPretty(undefined as any)).toBe(undefined);
        });

        test('should handle non-string values', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            const numberValue = 123 as any;
            const result = formulaProperty.getPretty(numberValue);
            
            expect(result).toBe(123);
            expect(consoleSpy).toHaveBeenCalledWith('Value is not a string:', 123);
            
            consoleSpy.mockRestore();
        });

        test('should format dates in French locale', () => {
            const dateString = '2023-12-25';
            const result = formulaProperty.getPretty(dateString);
            
            expect(result).toBe('25 décembre 2023');
        });

        test('should format integers with French locale formatting', () => {
            const integerString = '1234';
            const result = formulaProperty.getPretty(integerString);
            
            // Vérifions d'abord le résultat réel
            console.log('Actual result:', JSON.stringify(result));
            // Le format peut varier selon l'environnement, testons que c'est bien formaté
            expect(result).toMatch(/1[,\s]234[.,]00/);
        });

        test('should not format decimal numbers as integers', () => {
            const decimalString = '123.45';
            const result = formulaProperty.getPretty(decimalString);
            
            expect(result).toBe('123.45');
        });

        test('should clean URLs by removing protocols', () => {
            expect(formulaProperty.getPretty('https://example.com')).toBe('example.com');
            expect(formulaProperty.getPretty('http://test.org')).toBe('test.org');
        });

        test('should clean Obsidian links by removing brackets', () => {
            expect(formulaProperty.getPretty('[[Note Title]]')).toBe('Note Title');
        });

        test('should handle complex strings with multiple cleanups', () => {
            const complexString = 'https://[[example.com]]';
            const result = formulaProperty.getPretty(complexString);
            
            expect(result).toBe('example.com');
        });

        test('should return regular strings unchanged', () => {
            const regularString = 'Just a normal string';
            const result = formulaProperty.getPretty(regularString);
            
            expect(result).toBe('Just a normal string');
        });
    });

    describe('getLink', () => {
        beforeEach(() => {
            formulaProperty = new FormulaProperty('test', mockVault, '1 + 1');
            formulaProperty.vault = mockVault;
        });

        test('should return input if falsy', () => {
            expect(formulaProperty.getLink('')).toBe('');
            expect(formulaProperty.getLink(null as any)).toBe(null);
            expect(formulaProperty.getLink(undefined as any)).toBe(undefined);
        });

        test('should create mailto links for emails', () => {
            expect(formulaProperty.getLink('test@example.com')).toBe('mailto:test@example.com');
            expect(formulaProperty.getLink('user.name+tag@domain.co.uk')).toBe('mailto:user.name+tag@domain.co.uk');
        });

        test('should handle Obsidian links', () => {
            mockVault.readLinkFile.mockReturnValue('path/to/file.md' as any);
            
            const result = formulaProperty.getLink('[[My Note]]');
            
            expect(result).toBe('obsidian://open?vault=TestVault&file=path%2Fto%2Ffile.md');
            expect(mockVault.readLinkFile).toHaveBeenCalledWith('My Note', true);
        });

        test('should handle Obsidian link errors gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            mockVault.readLinkFile.mockImplementation(() => {
                throw new Error('File not found');
            });
            
            const result = formulaProperty.getLink('[[Invalid Note]]');
            
            expect(result).toBe('[[Invalid Note]]');
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error parsing link for [[Invalid Note]]:',
                expect.any(Error)
            );
            
            consoleSpy.mockRestore();
        });

        test('should handle URLs with protocols', () => {
            expect(formulaProperty.getLink('https://example.com')).toBe('https://example.com');
            expect(formulaProperty.getLink('http://test.org/path')).toBe('http://test.org/path');
        });

        test('should add protocol to URLs without them', () => {
            expect(formulaProperty.getLink('example.com')).toBe('http://example.com');
            expect(formulaProperty.getLink('test.org/path')).toBe('http://test.org/path');
        });

        test('should return regular strings unchanged', () => {
            const regularString = 'Just a normal string';
            const result = formulaProperty.getLink(regularString);
            
            expect(result).toBe('Just a normal string');
        });

        test('should handle invalid URL formats', () => {
            const invalidUrl = 'not-a-url';
            const result = formulaProperty.getLink(invalidUrl);
            
            expect(result).toBe('not-a-url');
        });
    });
});

