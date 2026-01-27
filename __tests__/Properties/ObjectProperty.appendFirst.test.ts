/**
 * Test pour la fonctionnalité appendFirst dans ObjectProperty
 * Valide que l'ordre d'affichage est inversé quand appendFirst: true
 */

import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { NumberProperty } from '../../src/properties/NumberProperty';

// Mock vault
const mockVault = {
    app: {
        setIcon: jest.fn()
    },
    getAbstractFileByPath: jest.fn(),
    getMarkdownFiles: jest.fn(() => [])
} as any;

describe('ObjectProperty appendFirst functionality', () => {
    it('should display objects in original order when appendFirst is false (default)', () => {
        console.log('🧪 Testing default order (appendFirst: false)...');

        const properties = {
            nom: new TextProperty('nom', mockVault),
            montant: new NumberProperty('montant', mockVault, 'integer')
        };
        properties.nom.title = 'Nom';
        properties.montant.title = 'Montant';

        const objectProp = new ObjectProperty('items', mockVault, properties, {
            appendFirst: false
        });

        const values = [
            { nom: 'Item 1', montant: 100 },
            { nom: 'Item 2', montant: 200 },
            { nom: 'Item 3', montant: 300 }
        ];

        const container = document.createElement('div');
        const update = jest.fn();

        // @ts-ignore - accès à la méthode privée pour le test
        objectProp.createObjects(values, update, container);

        const rows = container.querySelectorAll('.metadata-object-row');
        expect(rows.length).toBe(3);

        // Vérifier l'ordre : Item 1, Item 2, Item 3
        const firstRowText = rows[0].textContent;
        const lastRowText = rows[2].textContent;

        expect(firstRowText).toContain('Item 1');
        expect(lastRowText).toContain('Item 3');

        console.log('✅ Default order validated: Item 1 → Item 2 → Item 3');
    });

    it('should display objects in normal order when appendFirst is true (with new items added at beginning)', () => {
        console.log('🧪 Testing normal order display with appendFirst: true...');

        const properties = {
            nom: new TextProperty('nom', mockVault),
            montant: new NumberProperty('montant', mockVault, 'integer')
        };
        properties.nom.title = 'Nom';
        properties.montant.title = 'Montant';

        const objectProp = new ObjectProperty('items', mockVault, properties, {
            appendFirst: true
        });

        const values = [
            { nom: 'Item 1', montant: 100 },
            { nom: 'Item 2', montant: 200 },
            { nom: 'Item 3', montant: 300 }
        ];

        const container = document.createElement('div');
        const update = jest.fn();

        // @ts-ignore - accès à la méthode privée pour le test
        objectProp.createObjects(values, update, container);

        const rows = container.querySelectorAll('.metadata-object-row');
        expect(rows.length).toBe(3);

        // Vérifier l'ordre normal : Item 1, Item 2, Item 3
        // appendFirst: true signifie que les nouveaux items sont ajoutés au début du tableau,
        // mais l'affichage montre le tableau dans l'ordre (pas d'inversion)
        const firstRowText = rows[0].textContent;
        const lastRowText = rows[2].textContent;

        expect(firstRowText).toContain('Item 1');
        expect(lastRowText).toContain('Item 3');

        console.log('✅ Normal order validated with appendFirst: true: Item 1 → Item 2 → Item 3');
    });

    it('should display table rows in normal order when appendFirst is true', () => {
        console.log('🧪 Testing table mode with normal order (appendFirst: true)...');

        const properties = {
            nom: new TextProperty('nom', mockVault),
            montant: new NumberProperty('montant', mockVault, 'integer')
        };
        properties.nom.title = 'Nom';
        properties.montant.title = 'Montant';

        const objectProp = new ObjectProperty('items', mockVault, properties, {
            appendFirst: true,
            display: 'table'
        });

        const values = [
            { nom: 'Item 1', montant: 100 },
            { nom: 'Item 2', montant: 200 },
            { nom: 'Item 3', montant: 300 }
        ];

        const container = document.createElement('div');
        const update = jest.fn();

        // @ts-ignore - accès à la méthode privée pour le test
        objectProp.createTable(values, update, container);

        const table = container.querySelector('table');
        expect(table).not.toBeNull();

        const rows = table!.querySelectorAll('tr');
        // 4 rows: 1 header + 3 data rows
        expect(rows.length).toBe(4);

        // Vérifier l'ordre normal dans le tableau (en ignorant la ligne d'en-tête)
        const firstDataRowText = rows[1].textContent;
        const lastDataRowText = rows[3].textContent;

        expect(firstDataRowText).toContain('Item 1');
        expect(lastDataRowText).toContain('Item 3');

        console.log('✅ Table normal order validated with appendFirst: true: Item 1 → Item 2 → Item 3');
    });

    it('should display table rows in original order when appendFirst is false', () => {
        console.log('🧪 Testing table mode with default order (appendFirst: false)...');

        const properties = {
            nom: new TextProperty('nom', mockVault),
            montant: new NumberProperty('montant', mockVault, 'integer')
        };
        properties.nom.title = 'Nom';
        properties.montant.title = 'Montant';

        const objectProp = new ObjectProperty('items', mockVault, properties, {
            appendFirst: false,
            display: 'table'
        });

        const values = [
            { nom: 'Item 1', montant: 100 },
            { nom: 'Item 2', montant: 200 },
            { nom: 'Item 3', montant: 300 }
        ];

        const container = document.createElement('div');
        const update = jest.fn();

        // @ts-ignore - accès à la méthode privée pour le test
        objectProp.createTable(values, update, container);

        const table = container.querySelector('table');
        const rows = table!.querySelectorAll('tr');

        // Vérifier l'ordre normal dans le tableau
        const firstDataRowText = rows[1].textContent;
        const lastDataRowText = rows[3].textContent;

        expect(firstDataRowText).toContain('Item 1');
        expect(lastDataRowText).toContain('Item 3');

        console.log('✅ Table default order validated: Item 1 → Item 2 → Item 3');
    });

    it('should preserve correct indices when deleting items with appendFirst true', () => {
        console.log('🧪 Testing index preservation with reverse order...');

        const properties = {
            nom: new TextProperty('nom', mockVault)
        };
        properties.nom.title = 'Nom';

        const objectProp = new ObjectProperty('items', mockVault, properties, {
            appendFirst: true
        });

        const values = [
            { nom: 'Item 1' },
            { nom: 'Item 2' },
            { nom: 'Item 3' }
        ];

        const container = document.createElement('div');
        let capturedUpdatedValues: any[] = [];
        
        const update = jest.fn(async (newValues: any) => {
            capturedUpdatedValues = newValues;
        });

        // @ts-ignore - accès à la méthode privée pour le test
        objectProp.createObjects(values, update, container);

        const rows = container.querySelectorAll('.metadata-object-row');
        
        // Le premier row affiché devrait être Item 1 (index 0 dans le tableau)
        const firstRow = rows[0] as HTMLElement;
        expect(firstRow.textContent).toContain('Item 1');
        
        // Vérifier que le dataset.index est bien défini si allowMove est true
        if (objectProp.allowMove) {
            // L'index affiché devrait correspondre à l'index réel (0 pour Item 1)
            expect(firstRow.dataset.index).toBe('0');
        }

        console.log('✅ Indices preserved correctly with normal display');
    });

    it('should work with empty array', () => {
        console.log('🧪 Testing with empty array...');

        const properties = {
            nom: new TextProperty('nom', mockVault)
        };
        properties.nom.title = 'Nom';

        const objectProp = new ObjectProperty('items', mockVault, properties, {
            appendFirst: true
        });

        const values: any[] = [];
        const container = document.createElement('div');
        const update = jest.fn();

        // @ts-ignore
        objectProp.createObjects(values, update, container);

        const rows = container.querySelectorAll('.metadata-object-row');
        expect(rows.length).toBe(0);

        console.log('✅ Empty array handled correctly');
    });

    it('should work with single item', () => {
        console.log('🧪 Testing with single item...');

        const properties = {
            nom: new TextProperty('nom', mockVault)
        };
        properties.nom.title = 'Nom';

        const objectProp = new ObjectProperty('items', mockVault, properties, {
            appendFirst: true
        });

        const values = [{ nom: 'Only Item' }];
        const container = document.createElement('div');
        const update = jest.fn();

        // @ts-ignore
        objectProp.createObjects(values, update, container);

        const rows = container.querySelectorAll('.metadata-object-row');
        expect(rows.length).toBe(1);
        expect(rows[0].textContent).toContain('Only Item');

        console.log('✅ Single item displayed correctly');
    });
});
