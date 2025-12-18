import { MultiFileProperty } from '../../src/properties/MultiFileProperty';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';
import { Classe } from '../../src/vault/Classe';

describe('MultiFileProperty - CurrentDocument passing', () => {
    let vault: Vault;
    let app: any;
    let currentDocument: Classe;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, {
            vaultPath: './test-vault',
            configPath: '__tests__/Config/test-configs'
        } as any);

        (vault as any).dataloader = {
            classConfigs: new Map([
                ['TestClasse', {
                    name: 'TestClasse',
                    parent: undefined,
                    baseConfig: {
                        properties: {},
                        folder: 'TestFolder',
                    }
                }]
            ])
        } as any;

        // Create currentDocument directly and setup manually
        currentDocument = new Classe(vault);
        (currentDocument as any).name = 'Current Document';
        (currentDocument as any).properties = [];
    });

    test('should pass currentDocument to addProperty through fillDisplay', async () => {
        const property = new MultiFileProperty('testFiles', vault, ['Institution'], {
            icon: '🏢',
            conditions: [{
                conditionType: 'directLink'
            }]
        });

        // Mock selectMultipleFile to verify it receives validation function
        let receivedValidationFunction: any = null;
        app.selectMultipleFile.mockImplementation(async (vault: any, classes: string[], options: any) => {
            receivedValidationFunction = options.validationFunction;
            return []; // User cancelled
        });

        const update = jest.fn();
        const container = document.createElement('div');

        // Call addProperty directly with currentDocument
        await (property as any).addProperty([], update, container, currentDocument);

        // Verify selectMultipleFile was called
        expect(app.selectMultipleFile).toHaveBeenCalled();
        
        // Verify validation function was created
        expect(receivedValidationFunction).toBeDefined();
        expect(typeof receivedValidationFunction).toBe('function');
    });

    test('should handle DirectLinkCondition with currentDocument in multi-select', async () => {
        // Create documents that link to currentDocument
        const linkedDoc1 = new Classe(vault);
        (linkedDoc1 as any).name = 'LinkedDoc1';
        
        const linkedDoc2 = new Classe(vault);
        (linkedDoc2 as any).name = 'LinkedDoc2';
        
        const unlinkedDoc = new Classe(vault);
        (unlinkedDoc as any).name = 'UnlinkedDoc';

        const property = new MultiFileProperty('testFiles', vault, ['TestClasse'], {
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

        // Add file properties to linked docs that return link to currentDocument
        const fileProperty1 = new MultiFileProperty('relatedDocs', vault, ['TestClasse']);
        (linkedDoc1 as any).properties = [fileProperty1];
        jest.spyOn(fileProperty1, 'read').mockResolvedValue([`[[${currentDocument.getName()}]]`]);
        
        const fileProperty2 = new MultiFileProperty('relatedDocs', vault, ['TestClasse']);
        (linkedDoc2 as any).properties = [fileProperty2];
        jest.spyOn(fileProperty2, 'read').mockResolvedValue([`[[${currentDocument.getName()}]]`]);
        
        (unlinkedDoc as any).properties = [];

        // Test validation
        const result1 = await validationFunction(linkedDoc1);
        const result2 = await validationFunction(linkedDoc2);
        const result3 = await validationFunction(unlinkedDoc);

        expect(result1).toBe(true); // Has link
        expect(result2).toBe(true); // Has link
        expect(result3).toBe(false); // No link
    });

    test('should work without conditions in multi-select', async () => {
        const property = new MultiFileProperty('testFiles', vault, ['Institution'], {
            icon: '🏢'
        });

        app.selectMultipleFile.mockResolvedValue([
            { getLink: () => '[[Institution1]]' },
            { getLink: () => '[[Institution2]]' }
        ]);

        const update = jest.fn();
        const container = document.createElement('div');

        // Call addProperty directly
        await (property as any).addProperty([], update, container, currentDocument);

        expect(app.selectMultipleFile).toHaveBeenCalledWith(
            vault,
            ['Institution'],
            expect.objectContaining({
                hint: expect.any(String),
                validationFunction: undefined // No conditions
            })
        );
    });

    test('should handle empty values array', async () => {
        const property = new MultiFileProperty('testFiles', vault, ['Institution'], {
            icon: '🏢',
            conditions: [{
                conditionType: 'directLink'
            }]
        });

        app.selectMultipleFile.mockResolvedValue([
            { getLink: () => '[[Institution1]]' }
        ]);

        const update = jest.fn();
        const container = document.createElement('div');
        
        // Call addProperty with empty array and currentDocument
        await (property as any).addProperty([], update, container, currentDocument);

        // Should still work and pass currentDocument
        expect(app.selectMultipleFile).toHaveBeenCalled();
        const callOptions = app.selectMultipleFile.mock.calls[0][2];
        expect(callOptions.validationFunction).toBeDefined();
    });
});
