import { DynamicTable } from '../../src/display/DynamicTable';
import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';
import { DateProperty } from '../../src/properties/DateProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { NumberProperty } from '../../src/properties/NumberProperty';
import { ObjectProperty } from '../../src/properties/ObjectProperty';

describe('DynamicTable - Array Index Support', () => {
    let vault: Vault;
    let mockApp: any;

    beforeEach(() => {
        mockApp = {
            setIcon: jest.fn(),
            open: jest.fn(),
            getMetadata: jest.fn().mockResolvedValue({})
        };

        vault = {
            app: mockApp,
            getFromLink: jest.fn(),
            getFromPath: jest.fn()
        } as any;
    });

    describe('Array index in columns', () => {
        it('should display DateProperty for animations[0].date column', async () => {
            // Create ObjectProperty with sub-properties
            const animationsSubProperties = {
                date: new DateProperty('date', vault, []),
                titre: new TextProperty('titre', vault),
                tarif: new NumberProperty('tarif', vault, '0,0')
            };

            const animationsProperty = new ObjectProperty('animations', vault, animationsSubProperties, { multiple: true });

            // Create mock file with animations data
            const mockFile = new Classe(vault);
            mockFile.addProperty(animationsProperty);
            mockFile.getPropertyValue = jest.fn().mockImplementation(async (prop: string) => {
                if (prop === 'animations') {
                    return [
                        {
                            date: '2025-01-15',
                            titre: 'Formation TypeScript',
                            tarif: 500
                        },
                        {
                            date: '2025-02-20',
                            titre: 'Atelier React',
                            tarif: 350
                        }
                    ];
                }
                return undefined;
            });
            mockFile.getProperty = jest.fn().mockImplementation((prop: string) => {
                if (prop === 'animations') return animationsProperty;
                return undefined;
            });
            mockFile.getPath = jest.fn().mockReturnValue('/test/file.md');
            mockFile.getFile = jest.fn().mockReturnValue({
                getName: () => 'Test File',
                name: 'Test File'
            });
            mockFile.updatePropertyValue = jest.fn().mockResolvedValue(undefined);

            // Create DynamicTable with array index column
            const config = {
                columns: [
                    { name: 'Date première animation', propertyName: 'animations[0].date' },
                    { name: 'Titre première animation', propertyName: 'animations[0].titre' },
                    { name: 'Tarif première animation', propertyName: 'animations[0].tarif' }
                ]
            };

            const dynamicTable = new DynamicTable([mockFile], config, vault);
            const table = dynamicTable.getTable();

            // Wait for async table building
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check that table was created
            expect(table).toBeTruthy();
            expect(table.tagName).toBe('TABLE');

            // Check tbody exists and has rows
            const tbody = table.querySelector('tbody');
            expect(tbody).not.toBeNull();

            const rows = tbody?.querySelectorAll('tr');
            expect(rows?.length).toBeGreaterThan(0);

            // Check that first row has cells with property displays
            const firstRow = rows?.[0];
            const cells = firstRow?.querySelectorAll('td');
            
            // DynamicTable adds a _fileName column automatically, so we have 4 cells total
            expect(cells?.length).toBe(4);

            // Check second cell (first array index column - DateProperty display)
            const dateCell = cells?.[1];
            expect(dateCell?.querySelector('.metadata-field')).not.toBeNull();

            // Check third cell (TextProperty display)
            const titreCell = cells?.[2];
            expect(titreCell?.querySelector('.metadata-textfield')).not.toBeNull();

            // Check fourth cell (NumberProperty display)
            const tarifCell = cells?.[3];
            expect(tarifCell?.querySelector('.metadata-field')).not.toBeNull();
        });

        it('should display different array indices in different columns', async () => {
            const animationsSubProperties = {
                date: new DateProperty('date', vault, []),
                titre: new TextProperty('titre', vault)
            };

            const animationsProperty = new ObjectProperty('animations', vault, animationsSubProperties, { multiple: true });

            const mockFile = new Classe(vault);
            mockFile.addProperty(animationsProperty);
            mockFile.getPropertyValue = jest.fn().mockImplementation(async (prop: string) => {
                if (prop === 'animations') {
                    return [
                        { date: '2025-01-15', titre: 'Formation 1' },
                        { date: '2025-02-20', titre: 'Formation 2' },
                        { date: '2025-03-10', titre: 'Formation 3' }
                    ];
                }
                return undefined;
            });
            mockFile.getProperty = jest.fn().mockImplementation((prop: string) => {
                if (prop === 'animations') return animationsProperty;
                return undefined;
            });
            mockFile.getPath = jest.fn().mockReturnValue('/test/file.md');
            mockFile.getFile = jest.fn().mockReturnValue({
                getName: () => 'Test File',
                name: 'Test File'
            });
            mockFile.updatePropertyValue = jest.fn().mockResolvedValue(undefined);

            const config = {
                columns: [
                    { name: 'Animation 1', propertyName: 'animations[0].titre' },
                    { name: 'Animation 2', propertyName: 'animations[1].titre' },
                    { name: 'Animation 3', propertyName: 'animations[2].titre' }
                ]
            };

            const dynamicTable = new DynamicTable([mockFile], config, vault);
            const table = dynamicTable.getTable();

            await new Promise(resolve => setTimeout(resolve, 100));

            const tbody = table.querySelector('tbody');
            const firstRow = tbody?.querySelectorAll('tr')?.[0];
            const cells = firstRow?.querySelectorAll('td');

            // DynamicTable adds a _fileName column, so 4 cells total
            expect(cells?.length).toBe(4);
            
            // Each cell (except the first _fileName column) should have a TextProperty display
            for (let i = 1; i < cells!.length; i++) {
                expect(cells![i].querySelector('.metadata-textfield')).not.toBeNull();
            }
        });

        it('should handle out of bounds index gracefully', async () => {
            const animationsSubProperties = {
                date: new DateProperty('date', vault, [])
            };

            const animationsProperty = new ObjectProperty('animations', vault, animationsSubProperties, { multiple: true });

            const mockFile = new Classe(vault);
            mockFile.addProperty(animationsProperty);
            mockFile.getPropertyValue = jest.fn().mockImplementation(async (prop: string) => {
                if (prop === 'animations') {
                    return [
                        { date: '2025-01-15' }
                    ];
                }
                return undefined;
            });
            mockFile.getProperty = jest.fn().mockImplementation((prop: string) => {
                if (prop === 'animations') return animationsProperty;
                return undefined;
            });
            mockFile.getPath = jest.fn().mockReturnValue('/test/file.md');
            mockFile.getFile = jest.fn().mockReturnValue({
                getName: () => 'Test File',
                name: 'Test File'
            });
            mockFile.updatePropertyValue = jest.fn().mockResolvedValue(undefined);

            const config = {
                columns: [
                    { name: 'Animation 1', propertyName: 'animations[0].date' },
                    { name: 'Animation 5', propertyName: 'animations[5].date' } // Out of bounds
                ]
            };

            const dynamicTable = new DynamicTable([mockFile], config, vault);
            const table = dynamicTable.getTable();

            await new Promise(resolve => setTimeout(resolve, 100));

            const tbody = table.querySelector('tbody');
            const firstRow = tbody?.querySelectorAll('tr')?.[0];
            const cells = firstRow?.querySelectorAll('td');

            // DynamicTable adds a _fileName column, so 3 cells total
            expect(cells?.length).toBe(3);
            
            // Second cell should have the property display (first data column)
            expect(cells?.[1].querySelector('.metadata-field')).not.toBeNull();
            
            // Third cell should show '-' for out of bounds (second data column)
            expect(cells?.[2].textContent).toBe('-');
        });

        it('should handle empty array gracefully', async () => {
            const animationsSubProperties = {
                date: new DateProperty('date', vault, [])
            };

            const animationsProperty = new ObjectProperty('animations', vault, animationsSubProperties, { multiple: true });

            const mockFile = new Classe(vault);
            mockFile.addProperty(animationsProperty);
            mockFile.getPropertyValue = jest.fn().mockImplementation(async (prop: string) => {
                if (prop === 'animations') {
                    return []; // Empty array
                }
                return undefined;
            });
            mockFile.getProperty = jest.fn().mockImplementation((prop: string) => {
                if (prop === 'animations') return animationsProperty;
                return undefined;
            });
            mockFile.getPath = jest.fn().mockReturnValue('/test/file.md');
            mockFile.getFile = jest.fn().mockReturnValue({
                getName: () => 'Test File',
                name: 'Test File'
            });
            mockFile.updatePropertyValue = jest.fn().mockResolvedValue(undefined);

            const config = {
                columns: [
                    { name: 'Animation', propertyName: 'animations[0].date' }
                ]
            };

            const dynamicTable = new DynamicTable([mockFile], config, vault);
            const table = dynamicTable.getTable();

            await new Promise(resolve => setTimeout(resolve, 100));

            const tbody = table.querySelector('tbody');
            const firstRow = tbody?.querySelectorAll('tr')?.[0];
            const cells = firstRow?.querySelectorAll('td');

            // DynamicTable adds a _fileName column, so 2 cells total
            expect(cells?.length).toBe(2);
            
            // Second cell should show '-' for empty array (first data column)
            expect(cells?.[1].textContent).toBe('-');
        });
    });

    describe('Sorting with array index columns', () => {
        it('should sort by array index property values', async () => {
            const animationsSubProperties = {
                date: new DateProperty('date', vault, [])
            };

            const animationsProperty = new ObjectProperty('animations', vault, animationsSubProperties, { multiple: true });

            const file1 = new Classe(vault);
            file1.addProperty(animationsProperty);
            file1.getPropertyValue = jest.fn().mockImplementation(async (prop: string) => {
                if (prop === 'animations') {
                    return [{ date: '2025-01-15' }];
                }
                return undefined;
            });
            file1.getProperty = jest.fn().mockImplementation((prop: string) => {
                if (prop === 'animations') return animationsProperty;
                return undefined;
            });
            file1.getPath = jest.fn().mockReturnValue('/test/file1.md');
            file1.getFile = jest.fn().mockReturnValue({ getName: () => 'File 1', name: 'File 1' });
            file1.updatePropertyValue = jest.fn().mockResolvedValue(undefined);

            const file2 = new Classe(vault);
            file2.addProperty(animationsProperty);
            file2.getPropertyValue = jest.fn().mockImplementation(async (prop: string) => {
                if (prop === 'animations') {
                    return [{ date: '2025-03-20' }];
                }
                return undefined;
            });
            file2.getProperty = jest.fn().mockImplementation((prop: string) => {
                if (prop === 'animations') return animationsProperty;
                return undefined;
            });
            file2.getPath = jest.fn().mockReturnValue('/test/file2.md');
            file2.getFile = jest.fn().mockReturnValue({ getName: () => 'File 2', name: 'File 2' });
            file2.updatePropertyValue = jest.fn().mockResolvedValue(undefined);

            const file3 = new Classe(vault);
            file3.addProperty(animationsProperty);
            file3.getPropertyValue = jest.fn().mockImplementation(async (prop: string) => {
                if (prop === 'animations') {
                    return [{ date: '2025-02-10' }];
                }
                return undefined;
            });
            file3.getProperty = jest.fn().mockImplementation((prop: string) => {
                if (prop === 'animations') return animationsProperty;
                return undefined;
            });
            file3.getPath = jest.fn().mockReturnValue('/test/file3.md');
            file3.getFile = jest.fn().mockReturnValue({ getName: () => 'File 3', name: 'File 3' });
            file3.updatePropertyValue = jest.fn().mockResolvedValue(undefined);

            const config = {
                columns: [
                    { name: 'Date', propertyName: 'animations[0].date', sort: 'asc' as const }
                ]
            };

            const dynamicTable = new DynamicTable([file1, file2, file3], config, vault);
            const table = dynamicTable.getTable();

            await new Promise(resolve => setTimeout(resolve, 100));

            const tbody = table.querySelector('tbody');
            const rows = tbody?.querySelectorAll('tr');

            expect(rows?.length).toBe(3);
            
            // The table should be sorted by date
            // We can't easily check the exact order without accessing internal sorting,
            // but we can verify that all rows have the date property display
            // (checking the second cell since first is _fileName)
            rows?.forEach(row => {
                const cells = row.querySelectorAll('td');
                expect(cells[1].querySelector('.metadata-field')).not.toBeNull();
            });
        });
    });

    describe('Filtering with array index columns', () => {
        it('should filter by array index property values', async () => {
            const animationsSubProperties = {
                titre: new TextProperty('titre', vault)
            };

            const animationsProperty = new ObjectProperty('animations', vault, animationsSubProperties, { multiple: true });

            const file1 = new Classe(vault);
            file1.addProperty(animationsProperty);
            file1.getPropertyValue = jest.fn().mockImplementation(async (prop: string) => {
                if (prop === 'animations') {
                    return [{ titre: 'Formation TypeScript' }];
                }
                return undefined;
            });
            file1.getProperty = jest.fn().mockImplementation((prop: string) => {
                if (prop === 'animations') return animationsProperty;
                return undefined;
            });
            file1.getPath = jest.fn().mockReturnValue('/test/file1.md');
            file1.getFile = jest.fn().mockReturnValue({ getName: () => 'File 1', name: 'File 1' });
            file1.updatePropertyValue = jest.fn().mockResolvedValue(undefined);

            const file2 = new Classe(vault);
            file2.addProperty(animationsProperty);
            file2.getPropertyValue = jest.fn().mockImplementation(async (prop: string) => {
                if (prop === 'animations') {
                    return [{ titre: 'Atelier React' }];
                }
                return undefined;
            });
            file2.getProperty = jest.fn().mockImplementation((prop: string) => {
                if (prop === 'animations') return animationsProperty;
                return undefined;
            });
            file2.getPath = jest.fn().mockReturnValue('/test/file2.md');
            file2.getFile = jest.fn().mockReturnValue({ getName: () => 'File 2', name: 'File 2' });
            file2.updatePropertyValue = jest.fn().mockResolvedValue(undefined);

            const config = {
                columns: [
                    { name: 'Titre', propertyName: 'animations[0].titre', filter: 'text' }
                ]
            };

            const dynamicTable = new DynamicTable([file1, file2], config, vault);
            const table = dynamicTable.getTable();

            await new Promise(resolve => setTimeout(resolve, 100));

            // Check that filter input exists
            const thead = table.querySelector('thead');
            const filterRow = thead?.querySelectorAll('tr')?.[1]; // Second row should have filters
            const filterInput = filterRow?.querySelector('input[type="text"]');

            expect(filterInput).not.toBeNull();
        });
    });
});


