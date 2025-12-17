import { TemplateEngine } from '../../src/Config/TemplateEngine';
import { Classe } from '../../src/vault/Classe';

describe('TemplateEngine', () => {
    describe('processTemplate', () => {
        it('should replace simple property placeholders', async () => {
            const metadata = {
                nom: 'John Doe',
                age: 30,
                ville: 'Paris'
            };

            const result = await TemplateEngine.processTemplate(
                '{nom} - {age} ans - {ville}',
                metadata
            );

            expect(result).toBe('John Doe - 30 ans - Paris');
        });

        it('should replace nested property placeholders', async () => {
            const metadata = {
                personne: {
                    nom: 'John',
                    prenom: 'Doe'
                },
                adresse: {
                    ville: 'Paris',
                    pays: 'France'
                }
            };

            const result = await TemplateEngine.processTemplate(
                '{personne.prenom} {personne.nom} - {adresse.ville}',
                metadata
            );

            expect(result).toBe('Doe John - Paris');
        });

        it('should replace array property placeholders with index', async () => {
            const metadata = {
                clients: [
                    { nom: 'Acme Corp', contact: 'John' },
                    { nom: 'Tech Inc', contact: 'Jane' }
                ]
            };

            const result = await TemplateEngine.processTemplate(
                '{clients[0].nom} - {clients[1].contact}',
                metadata
            );

            expect(result).toBe('Acme Corp - Jane');
        });

        it('should handle {current} placeholder', async () => {
            const metadata = { nom: 'Test' };

            const result = await TemplateEngine.processTemplate(
                '{nom} - {current}',
                metadata,
                'OldName'
            );

            expect(result).toBe('Test - OldName');
        });

        it('should clean {current} from prefix', async () => {
            const metadata = { prefix: 'PREFIX' };

            const result = await TemplateEngine.processTemplate(
                '{prefix} - {current}',
                metadata,
                'PREFIX - OldContent'
            );

            expect(result).toBe('PREFIX - OldContent');
        });

        it('should return null when placeholder value is missing', async () => {
            const metadata = { nom: 'Test' };

            const result = await TemplateEngine.processTemplate(
                '{nom} - {missing}',
                metadata
            );

            expect(result).toBeNull();
        });

        it('should return null when array index is out of bounds', async () => {
            const metadata = {
                items: ['a', 'b']
            };

            const result = await TemplateEngine.processTemplate(
                '{items[5]}',
                metadata
            );

            expect(result).toBeNull();
        });

        it('should convert Date to ISO format', async () => {
            const metadata = {
                date: new Date('2025-12-17T10:30:00Z')
            };

            const result = await TemplateEngine.processTemplate(
                'Date: {date}',
                metadata
            );

            expect(result).toBe('Date: 2025-12-17');
        });

        it('should handle empty string as missing value', async () => {
            const metadata = {
                nom: 'Test',
                empty: ''
            };

            const result = await TemplateEngine.processTemplate(
                '{nom} - {empty}',
                metadata
            );

            expect(result).toBeNull();
        });

        it('should handle multiple placeholders of same property', async () => {
            const metadata = { nom: 'Test' };

            const result = await TemplateEngine.processTemplate(
                '{nom} - {nom} - {nom}',
                metadata
            );

            expect(result).toBe('Test - Test - Test');
        });
    });

    describe('processTemplateFromInstance', () => {
        it('should process template from Classe instance', async () => {
            const mockFile = {
                basename: 'TestFile',
                getMetadata: jest.fn().mockResolvedValue({
                    nom: 'Test Instance',
                    type: 'Test'
                })
            } as any;

            const mockVault = {
                app: {
                    getMetadata: jest.fn().mockImplementation((file) => file.getMetadata())
                }
            } as any;

            const instance = new Classe(mockVault, mockFile);

            const result = await TemplateEngine.processTemplateFromInstance(
                '{type} - {nom}',
                instance
            );

            expect(result).toBe('Test - Test Instance');
        });

        it('should use getPretty for FileProperty values', async () => {
            const mockFile = {
                basename: 'TestFile',
                getMetadata: jest.fn().mockResolvedValue({
                    client: '[[Client ABC]]',
                    nom: 'Test'
                })
            } as any;

            const mockVault = {
                app: {
                    getMetadata: jest.fn().mockImplementation((file) => file.getMetadata())
                },
                readLinkFile: jest.fn((link) => {
                    // Simulate extracting the name from [[Client ABC]]
                    const match = link.match(/\[\[([^\]]+)\]\]/);
                    return match ? match[1] : link;
                })
            } as any;

            const instance = new Classe(mockVault, mockFile);

            // Add a mock property with getPretty
            const mockProperty = {
                name: 'client',
                getPretty: jest.fn((value) => {
                    // Simulate FileProperty.getPretty which calls vault.readLinkFile
                    return mockVault.readLinkFile(value);
                })
            };
            instance.addProperty(mockProperty as any);

            const result = await TemplateEngine.processTemplateFromInstance(
                '{client} - {nom}',
                instance
            );

            // Should use getPretty which returns "Client ABC" instead of "[[Client ABC]]"
            expect(mockProperty.getPretty).toHaveBeenCalledWith('[[Client ABC]]');
            expect(result).toBe('Client ABC - Test');
        });

        it('should fallback to metadata when property has no getPretty', async () => {
            const mockFile = {
                basename: 'TestFile',
                getMetadata: jest.fn().mockResolvedValue({
                    nom: 'Test Instance',
                    age: 25
                })
            } as any;

            const mockVault = {
                app: {
                    getMetadata: jest.fn().mockImplementation((file) => file.getMetadata())
                }
            } as any;

            const instance = new Classe(mockVault, mockFile);

            // Add a property without getPretty
            const mockProperty = {
                name: 'age',
                read: jest.fn().mockResolvedValue(25)
            };
            instance.addProperty(mockProperty as any);

            const result = await TemplateEngine.processTemplateFromInstance(
                '{nom} - {age}',
                instance
            );

            // Should use metadata value directly
            expect(result).toBe('Test Instance - 25');
        });

        it('should handle {current} with instance file basename', async () => {
            const mockFile = {
                basename: 'CurrentName',
                getMetadata: jest.fn().mockResolvedValue({
                    prefix: 'PRE'
                })
            } as any;

            const mockVault = {
                app: {
                    getMetadata: jest.fn().mockImplementation((file) => file.getMetadata())
                }
            } as any;

            const instance = new Classe(mockVault, mockFile);

            const result = await TemplateEngine.processTemplateFromInstance(
                '{prefix} - {current}',
                instance,
                'CurrentName'
            );

            expect(result).toBe('PRE - CurrentName');
        });
    });
});
