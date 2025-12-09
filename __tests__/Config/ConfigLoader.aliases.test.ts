import { ConfigLoader } from '../../src/Config/ConfigLoader';
import { Vault } from '../../src/vault/Vault';
import { IApp } from '../../src/interfaces/IApp';
import { DateProperty } from '../../src/properties/DateProperty';
import { SelectProperty } from '../../src/properties/SelectProperty';
import { EmailProperty } from '../../src/properties/EmailProperty';

describe('ConfigLoader - Property Aliases from YAML', () => {
    let mockApp: IApp;
    let vault: Vault;
    let configLoader: ConfigLoader;

    beforeEach(() => {
        vault = {
            app: null as any,
            files: new Map(),
            folders: new Map()
        } as any;

        mockApp = {
            vault: vault,
            getSettings: jest.fn(() => ({
                deleteAliasesAfterMigration: true
            })),
            getFile: jest.fn(),
            readFile: jest.fn(),
            updateMetadata: jest.fn(),
            getFiles: jest.fn(() => []),
            getFolders: jest.fn(() => []),
            createFolder: jest.fn(),
            createFile: jest.fn(),
            renameFile: jest.fn(),
            deleteFile: jest.fn()
        } as any;
        
        vault.app = mockApp;

        configLoader = new ConfigLoader('', vault);
    });

    it('should create property with aliases from config', () => {
        const propertyConfig: any = {
            propertyKey: 'dateEntree',
            type: 'DateProperty',
            title: "Date d'entrée",
            icon: '📅',
            aliases: ['date_entree', 'dateDebut']
        };

        const property = configLoader.createProperty(propertyConfig);
        
        expect(property).toBeInstanceOf(DateProperty);
        expect(property.name).toBe('dateEntree');
        expect(property.aliases).toEqual(['date_entree', 'dateDebut']);
    });

    it('should create SelectProperty with aliases', () => {
        const propertyConfig: any = {
            propertyKey: 'statut',
            type: 'SelectProperty',
            title: 'Statut',
            icon: '🏷️',
            aliases: ['status', 'etat'],
            options: ['Actif', 'Inactif']
        };

        const property = configLoader.createProperty(propertyConfig) as SelectProperty;
        
        expect(property).toBeInstanceOf(SelectProperty);
        expect(property.name).toBe('statut');
        expect(property.aliases).toEqual(['status', 'etat']);
    });

    it('should create property without aliases when not specified', () => {
        const propertyConfig: any = {
            propertyKey: 'email',
            type: 'EmailProperty',
            title: 'Email',
            icon: '📧'
            // No aliases field
        };

        const property = configLoader.createProperty(propertyConfig);
        
        expect(property).toBeInstanceOf(EmailProperty);
        expect(property.name).toBe('email');
        expect(property.aliases).toBeUndefined();
    });

    it('should handle empty aliases array', () => {
        const propertyConfig: any = {
            propertyKey: 'nom',
            type: 'Property',
            title: 'Nom',
            aliases: []
        };

        const property = configLoader.createProperty(propertyConfig);
        
        expect(property.name).toBe('nom');
        expect(property.aliases).toEqual([]);
    });
});
