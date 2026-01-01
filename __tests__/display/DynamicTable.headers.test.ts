/**
 * @jest-environment jsdom
 */

import { DynamicTable } from '../../src/display/DynamicTable';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { mockApp } from '../utils/mocks';

// Mock class for testing
class MockTestFile extends Classe {
    constructor(vault: Vault, fileName: string, etat: string, montant: number) {
        super(vault);
        this.fileName = fileName;
        this.mockData = { etat, montant };
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
        return this.mockData[propertyName] || '';
    }

    getProperty(name: string) {
        return {
            type: name === 'montant' ? 'number' : 'select',
            getDisplay: jest.fn().mockResolvedValue(document.createElement('span'))
        } as any;
    }
}

describe('DynamicTable Headers with Count and Sort Icons', () => {
    let vault: Vault;
    let mockFiles: MockTestFile[];

    beforeEach(() => {
        const app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        
        mockFiles = [
            new MockTestFile(vault, 'project-1', 'En cours', 1000),
            new MockTestFile(vault, 'project-2', 'Terminé', 2000),
            new MockTestFile(vault, 'project-3', 'En cours', 1500),
            new MockTestFile(vault, 'project-4', 'Annulé', 500)
        ];
    });

    test('should display element count in headers', async () => {
        const config = {
            columns: [
                { name: 'Fichier', propertyName: '_fileName' },
                { name: 'État', propertyName: 'etat' },
                { name: 'Montant', propertyName: 'montant' }
            ]
        };

        const table = new DynamicTable(mockFiles, config, vault);
        const tableElement = table.getTable();
        
        // Wait for the table to be built
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check the main header row (not filter row)
        const headers = tableElement.querySelectorAll('thead tr:first-child th');
        expect(headers.length).toBe(3);
        
        // Each header should contain the count (4)
        headers.forEach(header => {
            const headerDiv = header.querySelector('div');
            expect(headerDiv).toBeTruthy();
            
            const countSpan = headerDiv?.querySelector('span:nth-child(2)');
            expect(countSpan).toBeTruthy();
            expect(countSpan?.textContent).toBe('(4)');
        });
    });

    test('should display sort icons in headers', async () => {
        const config = {
            columns: [
                { name: 'Fichier', propertyName: '_fileName', sort: 'asc' as const },
                { name: 'État', propertyName: 'etat' },
                { name: 'Montant', propertyName: 'montant' }
            ]
        };

        const table = new DynamicTable(mockFiles, config, vault);
        const tableElement = table.getTable();
        
        // Wait for the table to be built
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check the main header row
        const headers = tableElement.querySelectorAll('thead tr:first-child th');
        
        headers.forEach((header, index) => {
            const headerDiv = header.querySelector('div');
            const sortIcon = headerDiv?.querySelector('span:nth-child(3)');
            expect(sortIcon).toBeTruthy();
            
            if (index === 0) {
                // First column has default sort (asc)
                expect(sortIcon?.textContent).toBe('▲');
                expect((sortIcon as HTMLElement)?.style.opacity).toBe('1');
            } else {
                // Other columns have sortable icon
                expect(sortIcon?.textContent).toBe('⇅');
                expect((sortIcon as HTMLElement)?.style.opacity).toBe('0.6');
            }
        });
    });

    test('should update sort icons when sorting', async () => {
        const config = {
            columns: [
                { name: 'Fichier', propertyName: '_fileName' },
                { name: 'État', propertyName: 'etat' },
                { name: 'Montant', propertyName: 'montant' }
            ]
        };

        const table = new DynamicTable(mockFiles, config, vault);
        const tableElement = table.getTable();
        
        // Wait for the table to be built
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Click on État column header to sort
        const headers = tableElement.querySelectorAll('thead tr:first-child th');
        const etatHeader = headers[1];
        
        // Simulate click
        (etatHeader as HTMLElement).click();
        
        // Wait for sort to be applied
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check sort icon for État column
        const headerDiv = etatHeader.querySelector('div');
        const etatSortIcon = headerDiv?.querySelector('span:nth-child(3)');
        expect(etatSortIcon?.textContent).toBe('▲'); // Should show ascending
        expect((etatSortIcon as HTMLElement)?.style.opacity).toBe('1');
        
        // Check other columns still show sortable icon
        const fichierHeaderDiv = headers[0].querySelector('div');
        const fichierSortIcon = fichierHeaderDiv?.querySelector('span:nth-child(3)');
        expect(fichierSortIcon?.textContent).toBe('⇅');
        expect((fichierSortIcon as HTMLElement)?.style.opacity).toBe('0.6');
    });

    test('should toggle sort direction when clicking same header', async () => {
        const config = {
            columns: [
                { name: 'Fichier', propertyName: '_fileName' },
                { name: 'Montant', propertyName: 'montant' }
            ]
        };

        const table = new DynamicTable(mockFiles, config, vault);
        const tableElement = table.getTable();
        
        // Wait for the table to be built
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const headers = tableElement.querySelectorAll('thead tr:first-child th');
        const montantHeader = headers[1];
        
        // First click - should sort ascending
        (montantHeader as HTMLElement).click();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        let headerDiv = montantHeader.querySelector('div');
        let sortIcon = headerDiv?.querySelector('span:nth-child(3)');
        expect(sortIcon?.textContent).toBe('▲');
        
        // Second click - should sort descending
        (montantHeader as HTMLElement).click();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        headerDiv = montantHeader.querySelector('div');
        sortIcon = headerDiv?.querySelector('span:nth-child(3)');
        expect(sortIcon?.textContent).toBe('▼');
    });

    test('should have proper header structure with title, count, and sort icon', async () => {
        const config = {
            columns: [
                { name: 'Fichier', propertyName: '_fileName' }, // Add _fileName explicitly
                { name: 'Test Column', propertyName: 'etat' }
            ]
        };

        const table = new DynamicTable(mockFiles, config, vault);
        const tableElement = table.getTable();
        
        // Wait for the table to be built
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const headers = tableElement.querySelectorAll('thead tr:first-child th');
        const testHeader = headers[1]; // Second header is our test column
        const headerDiv = testHeader?.querySelector('div');
        
        expect(headerDiv).toBeTruthy();
        
        // Check header structure: title, count, sort icon
        const titleSpan = headerDiv?.querySelector('span:nth-child(1)');
        const countSpan = headerDiv?.querySelector('span:nth-child(2)');
        const sortIcon = headerDiv?.querySelector('span:nth-child(3)');
        
        expect(titleSpan?.textContent).toBe('Test Column');
        expect(countSpan?.textContent).toBe('(4)');
        expect(sortIcon?.textContent).toBe('⇅'); // Default sortable icon
        
        // Check styles
        expect((headerDiv as HTMLElement)?.style.display).toBe('flex');
        expect((headerDiv as HTMLElement)?.style.alignItems).toBe('center');
        expect((headerDiv as HTMLElement)?.style.justifyContent).toBe('space-between');
    });
});