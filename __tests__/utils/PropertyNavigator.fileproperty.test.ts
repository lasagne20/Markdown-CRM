import { PropertyNavigator } from '../../src/utils/PropertyNavigator';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { FileProperty } from '../../src/properties/FileProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { DateProperty } from '../../src/properties/DateProperty';

describe('PropertyNavigator - FileProperty Links', () => {
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

    describe('FileProperty with linked class properties', () => {
        it('should display property from linked class via FileProperty', async () => {
            // Create the linked class (e.g., Client)
            const clientClasse = new Classe(vault);
            const prochaineTacheProperty = new TextProperty('prochaineTache', vault);
            clientClasse.addProperty(prochaineTacheProperty);
            
            // Mock getPropertyValue to return a value for prochaineTache
            clientClasse.getPropertyValue = jest.fn().mockImplementation(async (propName: string) => {
                if (propName === 'prochaineTache') {
                    return 'Relancer le prospect';
                }
                return undefined;
            });
            
            clientClasse.getName = jest.fn().mockReturnValue('Client Alpha');

            // Create the main class with a FileProperty pointing to the client
            const mainClasse = new Classe(vault);
            const clientProperty = new FileProperty('client', vault, ['Client']);
            mainClasse.addProperty(clientProperty);

            // Mock getPropertyValue to return the client link
            mainClasse.getPropertyValue = jest.fn().mockImplementation(async (propName: string) => {
                if (propName === 'client') {
                    return '[[Client Alpha]]';
                }
                return undefined;
            });

            // Mock vault.getFromLink to return the linked class
            (vault.getFromLink as jest.Mock).mockResolvedValue(clientClasse);

            // Create PropertyNavigator
            const propertyNavigator = new PropertyNavigator(
                vault,
                mainClasse,
                mainClasse.getAllProperties(),
                async (propertyName: string, newValue: any) => {
                    await mainClasse.updatePropertyValue(propertyName, newValue);
                }
            );

            // Get display for client.prochaineTache
            const display = await propertyNavigator.getPropertyDisplayForPath('client.prochaineTache', 'Prochaine Tâche');

            expect(display).not.toBeNull();
            expect(display?.className).toBe('metadata-property');
            expect(vault.getFromLink).toHaveBeenCalledWith('[[Client Alpha]]');
            expect(clientClasse.getPropertyValue).toHaveBeenCalledWith('prochaineTache');
        });

        it('should handle FileProperty with DateProperty in linked class', async () => {
            // Create the linked class
            const clientClasse = new Classe(vault);
            const derniereInteractionProperty = new DateProperty('derniereInteraction', vault, []);
            clientClasse.addProperty(derniereInteractionProperty);

            clientClasse.getPropertyValue = jest.fn().mockImplementation(async (propName: string) => {
                if (propName === 'derniereInteraction') {
                    return '2025-01-15';
                }
                return undefined;
            });

            clientClasse.getName = jest.fn().mockReturnValue('Client Beta');

            // Main class with FileProperty
            const mainClasse = new Classe(vault);
            const clientProperty = new FileProperty('client', vault, ['Client']);
            mainClasse.addProperty(clientProperty);

            mainClasse.getPropertyValue = jest.fn().mockImplementation(async (propName: string) => {
                if (propName === 'client') {
                    return '[[Client Beta]]';
                }
                return undefined;
            });

            (vault.getFromLink as jest.Mock).mockResolvedValue(clientClasse);

            const propertyNavigator = new PropertyNavigator(
                vault,
                mainClasse,
                mainClasse.getAllProperties(),
                async (propertyName: string, newValue: any) => {
                    await mainClasse.updatePropertyValue(propertyName, newValue);
                }
            );

            const display = await propertyNavigator.getPropertyDisplayForPath('client.derniereInteraction');

            expect(display).not.toBeNull();
            // DateProperty creates a metadata-field container
            expect(display?.classList.contains('metadata-field')).toBe(true);
        });

        it('should return null when FileProperty link is empty', async () => {
            const mainClasse = new Classe(vault);
            const clientProperty = new FileProperty('client', vault, ['Client']);
            mainClasse.addProperty(clientProperty);

            // Return empty link
            mainClasse.getPropertyValue = jest.fn().mockResolvedValue('');

            const propertyNavigator = new PropertyNavigator(
                vault,
                mainClasse,
                mainClasse.getAllProperties(),
                async (propertyName: string, newValue: any) => {
                    await mainClasse.updatePropertyValue(propertyName, newValue);
                }
            );

            const display = await propertyNavigator.getPropertyDisplayForPath('client.prochaineTache');

            expect(display).toBeNull();
            expect(vault.getFromLink).not.toHaveBeenCalled();
        });

        it('should return null when linked class cannot be resolved', async () => {
            const mainClasse = new Classe(vault);
            const clientProperty = new FileProperty('client', vault, ['Client']);
            mainClasse.addProperty(clientProperty);

            mainClasse.getPropertyValue = jest.fn().mockResolvedValue('[[Unknown Client]]');

            // Mock vault.getFromLink to return null (class not found)
            (vault.getFromLink as jest.Mock).mockResolvedValue(null);

            const propertyNavigator = new PropertyNavigator(
                vault,
                mainClasse,
                mainClasse.getAllProperties(),
                async (propertyName: string, newValue: any) => {
                    await mainClasse.updatePropertyValue(propertyName, newValue);
                }
            );

            const display = await propertyNavigator.getPropertyDisplayForPath('client.prochaineTache');

            expect(display).toBeNull();
            expect(vault.getFromLink).toHaveBeenCalledWith('[[Unknown Client]]');
        });

        it('should return null when property does not exist in linked class', async () => {
            const clientClasse = new Classe(vault);
            const nomProperty = new TextProperty('nom', vault);
            clientClasse.addProperty(nomProperty);

            clientClasse.getName = jest.fn().mockReturnValue('Client Gamma');

            const mainClasse = new Classe(vault);
            const clientProperty = new FileProperty('client', vault, ['Client']);
            mainClasse.addProperty(clientProperty);

            mainClasse.getPropertyValue = jest.fn().mockResolvedValue('[[Client Gamma]]');
            (vault.getFromLink as jest.Mock).mockResolvedValue(clientClasse);

            const propertyNavigator = new PropertyNavigator(
                vault,
                mainClasse,
                mainClasse.getAllProperties(),
                async (propertyName: string, newValue: any) => {
                    await mainClasse.updatePropertyValue(propertyName, newValue);
                }
            );

            // Try to access a property that doesn't exist
            const display = await propertyNavigator.getPropertyDisplayForPath('client.nonExistentProperty');

            expect(display).toBeNull();
        });

        it('should handle vault.getFromLink errors gracefully', async () => {
            const mainClasse = new Classe(vault);
            const clientProperty = new FileProperty('client', vault, ['Client']);
            mainClasse.addProperty(clientProperty);

            mainClasse.getPropertyValue = jest.fn().mockResolvedValue('[[Client Delta]]');

            // Mock vault.getFromLink to throw an error
            (vault.getFromLink as jest.Mock).mockRejectedValue(new Error('Vault error'));

            const propertyNavigator = new PropertyNavigator(
                vault,
                mainClasse,
                mainClasse.getAllProperties(),
                async (propertyName: string, newValue: any) => {
                    await mainClasse.updatePropertyValue(propertyName, newValue);
                }
            );

            const display = await propertyNavigator.getPropertyDisplayForPath('client.prochaineTache');

            expect(display).toBeNull();
        });

        it('should wrap with title when provided', async () => {
            const clientClasse = new Classe(vault);
            const emailProperty = new TextProperty('email', vault);
            clientClasse.addProperty(emailProperty);

            clientClasse.getPropertyValue = jest.fn().mockResolvedValue('contact@example.com');
            clientClasse.getName = jest.fn().mockReturnValue('Client Epsilon');

            const mainClasse = new Classe(vault);
            const clientProperty = new FileProperty('client', vault, ['Client']);
            mainClasse.addProperty(clientProperty);

            mainClasse.getPropertyValue = jest.fn().mockResolvedValue('[[Client Epsilon]]');
            (vault.getFromLink as jest.Mock).mockResolvedValue(clientClasse);

            const propertyNavigator = new PropertyNavigator(
                vault,
                mainClasse,
                mainClasse.getAllProperties(),
                async (propertyName: string, newValue: any) => {
                    await mainClasse.updatePropertyValue(propertyName, newValue);
                }
            );

            const display = await propertyNavigator.getPropertyDisplayForPath('client.email', 'Email du Client');

            expect(display).not.toBeNull();
            expect(display?.className).toBe('metadata-property');
            
            const titleElement = display?.querySelector('.metadata-property-key');
            expect(titleElement).not.toBeNull();
            expect(titleElement?.textContent).toBe('Email du Client');

            const valueWrapper = display?.querySelector('.metadata-property-value');
            expect(valueWrapper).not.toBeNull();
        });
    });
});
