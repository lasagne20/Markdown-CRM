import { ConfigLoader } from '../../src/Config/ConfigLoader';
import { Vault } from '../../src/vault/Vault';
import { IApp, IFile, IFolder, ISettings } from '../../src/interfaces/IApp';
import { PropertyConfig } from '../../src/Config/interfaces';

// Mock minimal pour les tests
class MockApp implements Partial<IApp> {
    private files: Map<string, string> = new Map();

    setIcon(element: HTMLElement, iconName: string): void {
        element.setAttribute('data-icon', iconName);
    }

    getSettings(): ISettings {
        return {
            classePropertyName: 'Classe',
            classePropertyAliases: [],
            deleteAliasesAfterMigration: true
        };
    }

    async readFile(file: IFile | string): Promise<string> {
        const path = typeof file === 'string' ? file : file.path;
        return this.files.get(path) || '';
    }

    async getFile(path: string): Promise<IFile | null> {
        if (this.files.has(path)) {
            return {
                path,
                name: path.split('/').pop() || '',
                basename: path.split('/').pop()?.replace('.yaml', '') || '',
                extension: 'yaml',
                parent: undefined,
                children: []
            };
        }
        return null;
    }

    async listFiles(folder?: IFolder): Promise<IFile[]> {
        return [];
    }

    setMockFile(path: string, content: string): void {
        this.files.set(path, content);
    }
}

describe('Property Tooltip Configuration Tests', () => {
    let configLoader: ConfigLoader;
    let vault: any;
    let mockApp: MockApp;

    beforeEach(() => {
        mockApp = new MockApp();
        vault = {
            app: mockApp,
            getPersonalName: () => 'Test User'
        };
        configLoader = new ConfigLoader('./config', vault as Vault);
    });

    describe('Tooltip from configuration', () => {
        it('should create Property with tooltip from config', () => {
            const config: PropertyConfig = {
                type: 'Property',
                tooltip: 'This is a helpful tooltip'
            };
            (config as any).propertyKey = 'testProp';

            const property = configLoader.createProperty(config);

            expect(property.tooltip).toBe('This is a helpful tooltip');
        });

        it('should create TextProperty with tooltip from config', () => {
            const config: PropertyConfig = {
                type: 'TextProperty',
                tooltip: 'Enter text here',
                icon: 'text'
            };
            (config as any).propertyKey = 'description';

            const property = configLoader.createProperty(config);

            expect(property.tooltip).toBe('Enter text here');
            expect(property.icon).toBe('text');
        });

        it('should create NumberProperty with tooltip from config', () => {
            const config: PropertyConfig = {
                type: 'NumberProperty',
                tooltip: 'Age in years',
                unit: 'years'
            };
            (config as any).propertyKey = 'age';

            const property = configLoader.createProperty(config);

            expect(property.tooltip).toBe('Age in years');
        });

        it('should create DateProperty with tooltip from config', () => {
            const config: PropertyConfig = {
                type: 'DateProperty',
                tooltip: 'Select birth date',
                icon: 'calendar'
            };
            (config as any).propertyKey = 'birthDate';

            const property = configLoader.createProperty(config);

            expect(property.tooltip).toBe('Select birth date');
        });

        it('should create SelectProperty with tooltip from config', () => {
            const config: PropertyConfig = {
                type: 'SelectProperty',
                tooltip: 'Choose status',
                options: [
                    { name: 'Active', color: 'green' },
                    { name: 'Inactive', color: 'red' }
                ]
            };
            (config as any).propertyKey = 'status';

            const property = configLoader.createProperty(config);

            expect(property.tooltip).toBe('Choose status');
        });

        it('should create BooleanProperty with tooltip from config', () => {
            const config: PropertyConfig = {
                type: 'BooleanProperty',
                tooltip: 'Mark as completed',
                icon: 'check-circle'
            };
            (config as any).propertyKey = 'completed';

            const property = configLoader.createProperty(config);

            expect(property.tooltip).toBe('Mark as completed');
        });

        it('should handle property without tooltip', () => {
            const config: PropertyConfig = {
                type: 'Property',
                icon: 'file'
            };
            (config as any).propertyKey = 'testProp';

            const property = configLoader.createProperty(config);

            expect(property.tooltip).toBe('');
        });

        it('should combine tooltip with other options', () => {
            const config: PropertyConfig = {
                type: 'TextProperty',
                title: 'Description Field',
                tooltip: 'Enter a detailed description',
                icon: 'file-text',
                static: false,
                aliases: ['desc', 'description_old']
            };
            (config as any).propertyKey = 'description';

            const property = configLoader.createProperty(config);

            expect(property.tooltip).toBe('Enter a detailed description');
            expect(property.title).toBe('Description Field');
            expect(property.icon).toBe('file-text');
            expect(property.static).toBe(false);
            expect(property.aliases).toEqual(['desc', 'description_old']);
        });
    });

    describe('Tooltip rendering from configuration', () => {
        it('should render tooltip in icon container', () => {
            const config: PropertyConfig = {
                type: 'Property',
                tooltip: 'Helpful tooltip text',
                icon: 'info'
            };
            (config as any).propertyKey = 'info';

            const property = configLoader.createProperty(config);
            const iconContainer = property.createIconContainer(async () => {});
            const icon = iconContainer.querySelector('div');

            expect(icon?.getAttribute('title')).toBe('Helpful tooltip text');
            expect(icon?.getAttribute('aria-label')).toBe('Helpful tooltip text');
        });

        it('should not add tooltip attributes when tooltip is not configured', () => {
            const config: PropertyConfig = {
                type: 'Property',
                icon: 'file'
            };
            (config as any).propertyKey = 'test';

            const property = configLoader.createProperty(config);
            const iconContainer = property.createIconContainer(async () => {});
            const icon = iconContainer.querySelector('div');

            expect(icon?.getAttribute('title')).toBeNull();
            expect(icon?.getAttribute('aria-label')).toBeNull();
        });
    });

    describe('Object Property with nested tooltip configuration', () => {
        it('should create ObjectProperty with tooltips for nested properties', () => {
            const config: PropertyConfig = {
                type: 'ObjectProperty',
                tooltip: 'Contact information',
                properties: {
                    email: {
                        type: 'EmailProperty',
                        tooltip: 'Enter email address'
                    },
                    phone: {
                        type: 'PhoneProperty',
                        tooltip: 'Enter phone number'
                    }
                }
            };
            (config as any).propertyKey = 'contact';

            const property = configLoader.createProperty(config);

            expect(property.tooltip).toBe('Contact information');
            
            // Vérifier les propriétés imbriquées
            const objectProperty = property as any;
            expect(objectProperty.properties.email.tooltip).toBe('Enter email address');
            expect(objectProperty.properties.phone.tooltip).toBe('Enter phone number');
        });
    });

    describe('Multiple property types with tooltip', () => {
        it('should support tooltip across all property types', () => {
            const propertyTypes = [
                { type: 'Property', tooltip: 'Base property' },
                { type: 'TextProperty', tooltip: 'Text input' },
                { type: 'NumberProperty', tooltip: 'Number input', unit: '' },
                { type: 'BooleanProperty', tooltip: 'True/False' },
                { type: 'DateProperty', tooltip: 'Date picker' },
                { type: 'SelectProperty', tooltip: 'Select option', options: [{ name: 'A', color: '' }] },
                { type: 'EmailProperty', tooltip: 'Email address' },
                { type: 'PhoneProperty', tooltip: 'Phone number' },
                { type: 'LinkProperty', tooltip: 'URL link' },
                { type: 'RatingProperty', tooltip: 'Rating stars' }
            ];

            propertyTypes.forEach((config, index) => {
                (config as any).propertyKey = `prop${index}`;
                const property = configLoader.createProperty(config as PropertyConfig);
                expect(property.tooltip).toBe(config.tooltip);
            });
        });
    });

    describe('Edge cases', () => {
        it('should handle empty tooltip string', () => {
            const config: PropertyConfig = {
                type: 'Property',
                tooltip: ''
            };
            (config as any).propertyKey = 'test';

            const property = configLoader.createProperty(config);
            expect(property.tooltip).toBe('');
        });

        it('should handle long tooltip text', () => {
            const longTooltip = 'This is a very long tooltip that provides extensive information about the field and what users should enter here. It can span multiple lines and contain detailed instructions.';
            
            const config: PropertyConfig = {
                type: 'Property',
                tooltip: longTooltip
            };
            (config as any).propertyKey = 'test';

            const property = configLoader.createProperty(config);
            expect(property.tooltip).toBe(longTooltip);
        });

        it('should handle tooltip with special characters', () => {
            const specialTooltip = 'Use "quotes" and <tags> & symbols';
            
            const config: PropertyConfig = {
                type: 'Property',
                tooltip: specialTooltip
            };
            (config as any).propertyKey = 'test';

            const property = configLoader.createProperty(config);
            expect(property.tooltip).toBe(specialTooltip);
        });
    });
});
