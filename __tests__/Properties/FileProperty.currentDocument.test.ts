import { FileProperty } from '../../src/properties/FileProperty';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';
import { Classe } from '../../src/vault/Classe';

describe('FileProperty - CurrentDocument passing', () => {
    let vault: Vault;
    let app: any;
    let currentDocument: Classe;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, {
            vaultPath: './test-vault',
            configPath: '__tests__/Config/test-configs'
        } as any);

        // Create a mock current document
        currentDocument = new Classe(vault);
        (currentDocument as any).name = 'CurrentDocument';
        (currentDocument as any).properties = {};
    });

    test('should pass currentDocument to handleIconClick through createIconContainer', async () => {
        const property = new FileProperty('testFile', vault, ['Institution'], {
            icon: '🏢',
            conditions: [{
                conditionType: 'directLink'
            }]
        });

        // Mock selectFile to verify it receives validation function with currentDocument
        let receivedValidationFunction: any = null;
        app.selectFile.mockImplementation(async (vault: any, classes: string[], options: any) => {
            receivedValidationFunction = options.validationFunction;
            return null; // User cancelled
        });

        // Simulate getDisplay which passes the classe
        const update = jest.fn();
        const display = await property.getDisplay(currentDocument);

        // Find the icon and click it
        const icon = display.querySelector('.icon-container div');
        expect(icon).toBeTruthy();
        
        // Simulate click
        await (icon as HTMLElement).click();

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify selectFile was called
        expect(app.selectFile).toHaveBeenCalled();
        
        // Verify validation function was created
        expect(receivedValidationFunction).toBeDefined();
        expect(typeof receivedValidationFunction).toBe('function');
    });

    test('should pass currentDocument through fillDisplay args', async () => {
        const property = new FileProperty('testFile', vault, ['Institution']);

        const spyCreateIconContainer = jest.spyOn(property, 'createIconContainer');
        
        const update = jest.fn();
        await property.getDisplay(currentDocument);

        // Verify createIconContainer was called with currentDocument
        expect(spyCreateIconContainer).toHaveBeenCalled();
        const calls = spyCreateIconContainer.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        expect(calls[0][1]).toBe(currentDocument); // Second parameter is classe
    });

    test('should handle DirectLinkCondition with currentDocument', async () => {
        // Create another document that links to currentDocument
        const linkedDoc = new Classe(vault);
        (linkedDoc as any).name = 'LinkedDocument';
        
        const fileProperty = new FileProperty('relatedDoc', vault, ['Classe']);
        (linkedDoc as any).properties = [fileProperty];

        // Mock the property read to return link to current document
        jest.spyOn(fileProperty, 'read').mockResolvedValue(`[[${currentDocument.getName()}]]`);

        const property = new FileProperty('testFile', vault, ['TestClasse'], {
            icon: '📄',
            conditions: [{
                conditionType: 'directLink'
            }]
        });

        // Create validation function with currentDocument
        const validationFunction = vault.conditionManager.createValidationFunction(
            property.conditions!,
            currentDocument
        );

        // linkedDoc should pass because it links to currentDocument
        const shouldPass = await validationFunction(linkedDoc);
        expect(shouldPass).toBe(true);

        // Create a doc without links
        const unlinkedDoc = new Classe(vault);
        (unlinkedDoc as any).name = 'UnlinkedDocument';
        (unlinkedDoc as any).properties = [];

        // unlinkedDoc should fail because it has no links
        const shouldFail = await validationFunction(unlinkedDoc);
        expect(shouldFail).toBe(false);
    });

    test('should work without conditions', async () => {
        const property = new FileProperty('testFile', vault, ['Institution'], {
            icon: '🏢'
        });

        app.selectFile.mockResolvedValue({
            getLink: () => '[[TestInstitution]]'
        });

        const update = jest.fn();
        const display = await property.getDisplay(currentDocument);

        const icon = display.querySelector('.icon-container div');
        await (icon as HTMLElement).click();

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(app.selectFile).toHaveBeenCalledWith(
            vault,
            ['Institution'],
            expect.objectContaining({
                hint: expect.any(String),
                validationFunction: undefined // No conditions
            })
        );
    });
});
