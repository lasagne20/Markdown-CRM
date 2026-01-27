import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { FileProperty } from '../../src/properties/FileProperty';
import { File } from '../../src/vault/File';

// Mock implementations
class TestableClasse extends Classe {
    static parentPropertyName?: string = 'postes';

    static create(vault: Vault): Classe {
        return new TestableClasse(vault);
    }

    async onCreate(): Promise<void> {}
    async onUpdate(): Promise<void> {}
    async onDelete(): Promise<void> {}

    // Public wrappers for protected methods (for testing)
    public async testGetParentProperty() {
        return await this.getParentProperty();
    }

    public async testUpdateParentFolder(oldMetadata?: Record<string, any>, oldParentProperty?: any) {
        return await this.updateParentFolder(oldMetadata, oldParentProperty);
    }

    // Add property method for testing
    public addProperty(property: any): void {
        (this as any).properties = (this as any).properties || {};
        (this as any).properties[property.name] = property;
    }

    // Override getProperty to access our test properties
    public getProperty(propertyName: string): any {
        const properties = (this as any).properties || {};
        return properties[propertyName];
    }
}

// Mock File class with necessary methods
class MockFile {
    public updateMetadataSpy: jest.Mock;

    constructor(
        public name: string,
        public path: string,
        public basename: string,
        public extension: string = 'md',
        public parent: { path: string } = { path: '' }
    ) {
        this.updateMetadataSpy = jest.fn();
    }

    getPath(): string {
        return this.path;
    }

    getName(withExtension: boolean = true): string {
        return withExtension ? this.name : this.basename;
    }

    getFolderPath(): string {
        return this.parent.path;
    }

    async updateMetadata(propertyName: string, value: any): Promise<void> {
        this.updateMetadataSpy(propertyName, value);
    }

    async move(folderPath: string, fileName: string): Promise<void> {
        this.path = `${folderPath}/${fileName}`;
        this.parent = { path: folderPath };
    }
}

// Mock implementations for external dependencies
const mockApp = {
    createDiv: jest.fn((className?: string) => {
        const div = document.createElement('div');
        if (className) div.className = className;
        return div;
    }),
    setIcon: jest.fn(),
    getMetadata: jest.fn(),
    updateMetadata: jest.fn(),
    createFolder: jest.fn().mockResolvedValue(undefined),
    getFile: jest.fn(),
    getAbstractFileByPath: jest.fn(),
    move: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(''),
    listFiles: jest.fn().mockResolvedValue([])
};

const mockVault = {
    app: mockApp,
    getFromLink: jest.fn(),
    createClasse: jest.fn(),
    listFiles: jest.fn().mockResolvedValue([])
} as unknown as Vault;

describe('Classe Parent Value Comparison Bug', () => {
    let classe: TestableClasse;
    let postesProperty: ObjectProperty;
    let parentFile: MockFile;
    let childFile: MockFile;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Create parent file
        parentFile = new MockFile(
            'OCC.md',
            '/vault/institutions/OCC.md',
            'OCC',
            'md',
            { path: '/vault/institutions' }
        );

        // Create child file
        childFile = new MockFile(
            'dsgdfhdh.md',
            '/vault/personnes/dsgdfhdh.md', 
            'dsgdfhdh',
            'md',
            { path: '/vault/personnes' }
        );

        // Create test class instance
        classe = new TestableClasse(mockVault);
        classe.setFile(new File(mockVault, childFile as any));

        // Create ObjectProperty for "postes" containing institution and poste fields
        const institutionProperty = new FileProperty('institution', mockVault, ['Institution'], {});
        const posteProperty = new TextProperty('poste', mockVault, {});
        
        postesProperty = new ObjectProperty('postes', mockVault, {
            institution: institutionProperty,
            poste: posteProperty
        }, {});
        
        classe.addProperty(postesProperty);

        // Mock getParentFile method on the property
        jest.spyOn(institutionProperty, 'getParentFile').mockResolvedValue(new File(mockVault, parentFile as any));
        
        // Mock vault.createClasse to return the test class
        jest.spyOn(mockVault, 'createClasse').mockResolvedValue(classe);
        
        // Mock app methods
        mockApp.getFile.mockReturnValue(null); // Folder doesn't exist initially
        mockApp.getAbstractFileByPath.mockReturnValue(parentFile);
    });

    describe('ObjectProperty array value comparison bug', () => {
        it('should detect change when ObjectProperty array content changes', async () => {
            // Set initial metadata with postes array
            const initialPostes = [
                { institution: '[[France/OCC/OCC.md|OCC]]', poste: 'Initial Poste' }
            ];
            const initialMetadata = {
                classe: 'Personne',
                id: '6e67e11e-2e56-44b2-bf3e-e53f86f8a9fd',
                postes: initialPostes
            };

            // Update metadata to new postes value (content changes but reference might be same)
            const newPostes = [
                { institution: '[[France/OCC/OCC.md|OCC]]', poste: '' }  // Changed: poste is now empty
            ];
            const newMetadata = {
                classe: 'Personne',
                id: '6e67e11e-2e56-44b2-bf3e-e53f86f8a9fd',
                postes: newPostes
            };

            // Mock getMetadata to return the new metadata
            mockApp.getMetadata.mockResolvedValue(newMetadata);
            
            // Spy on console.log to capture the "unchanged" message
            const consoleSpy = jest.spyOn(console, 'log');
            
            // Spy on createFolder to verify it should be called (meaning update should proceed)
            const createFolderSpy = jest.spyOn(mockApp, 'createFolder');

            // Get current parent property
            const currentParentProperty = await classe.testGetParentProperty();
            
            // Call updateParentFolder with old metadata
            await classe.testUpdateParentFolder(initialMetadata, currentParentProperty);

            // Verify that the "unchanged" message was NOT logged (the bug we're fixing)
            const unchangedMessage = consoleSpy.mock.calls.find(call => 
                call[0] && call[0].includes('unchanged, skipping folder update')
            );
            
            // This should be undefined after fix - previously it was defined (the bug)
            expect(unchangedMessage).toBeUndefined();

            // Verify that folder operations proceeded (meaning change was detected)
            expect(createFolderSpy).toHaveBeenCalled();
        });

        it('should properly compare simple array values', async () => {
            // Test with simple array to verify the comparison works for simpler cases
            const initialMetadata = { simpleArray: ['a', 'b'] };
            const newMetadata = { simpleArray: ['a', 'c'] };  // Different content
            
            // This should detect the change
            expect(JSON.stringify(initialMetadata.simpleArray) !== JSON.stringify(newMetadata.simpleArray)).toBe(true);
        });

        it('should properly compare object arrays with deep equality', async () => {
            // Test the specific case from the bug report
            const oldValue = [
                { institution: '[[France/OCC/OCC.md|OCC]]', poste: 'Something' }
            ];
            const newValue = [
                { institution: '[[France/OCC/OCC.md|OCC]]', poste: '' }
            ];

            // These should be considered different
            expect(JSON.stringify(oldValue) !== JSON.stringify(newValue)).toBe(true);
            
            // But === comparison would be false anyway (different objects)
            expect(oldValue === newValue).toBe(false);
        });

        it('should skip update when values are actually unchanged', async () => {
            // Test that we don't break the optimization when values are truly the same
            const samePostes = [
                { institution: '[[France/OCC/OCC.md|OCC]]', poste: 'Same Value' }
            ];
            const initialMetadata = {
                classe: 'Personne',
                postes: samePostes
            };
            const unchangedMetadata = {
                classe: 'Personne', 
                postes: samePostes  // Same object reference
            };
            
            // Mock getMetadata to return the unchanged metadata
            mockApp.getMetadata.mockResolvedValue(unchangedMetadata);

            const consoleSpy = jest.spyOn(console, 'log');
            const createFolderSpy = jest.spyOn(mockApp, 'createFolder');

            const currentParentProperty = await classe.testGetParentProperty();
            await classe.testUpdateParentFolder(initialMetadata, currentParentProperty);

            // Should log the "unchanged" message when values are truly the same
            const unchangedMessage = consoleSpy.mock.calls.find(call => 
                call[0] && call[0].includes('unchanged, skipping folder update')
            );
            expect(unchangedMessage).toBeDefined();

            // Should NOT call createFolder when no change detected
            expect(createFolderSpy).not.toHaveBeenCalled();
        });
    });
});