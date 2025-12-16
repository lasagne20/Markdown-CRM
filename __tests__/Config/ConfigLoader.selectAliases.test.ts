import { ConfigLoader } from '../../src/Config/ConfigLoader';
import { SelectProperty } from '../../src/properties/SelectProperty';
import { MultiSelectProperty } from '../../src/properties/MultiSelectProperty';

describe('ConfigLoader - Select Property Aliases', () => {
    let configLoader: ConfigLoader;
    let mockVault: any;

    beforeEach(() => {
        mockVault = {
            app: {
                vault: { getFiles: jest.fn(() => []) },
                setIcon: jest.fn()
            }
        };
        configLoader = new ConfigLoader('config', mockVault);
    });

    describe('SelectProperty with aliases from YAML', () => {
        it('should parse SelectProperty options with aliases in YAML object format', () => {
            const config = {
                type: 'SelectProperty',
                options: [
                    { 'Management': ['management', 'manager'] },
                    'Technique',
                    { 'Communication': ['com', 'comm'] }
                ]
            };

            const property = configLoader.createProperty(config) as SelectProperty;

            expect(property).toBeInstanceOf(SelectProperty);
            expect(property.options.length).toBe(3);
            
            // First option with aliases
            expect(property.options[0].name).toBe('Management');
            expect(property.options[0].aliases).toEqual(['management', 'manager']);
            
            // Second option without aliases
            expect(property.options[1].name).toBe('Technique');
            expect(property.options[1].aliases).toEqual([]);
            
            // Third option with aliases
            expect(property.options[2].name).toBe('Communication');
            expect(property.options[2].aliases).toEqual(['com', 'comm']);
        });

        it('should handle SelectProperty with standard format (no aliases)', () => {
            const config = {
                type: 'SelectProperty',
                options: [
                    { name: 'Option1', color: '#FF0000' },
                    'Option2',
                    { name: 'Option3', color: '#00FF00', aliases: ['opt3'] }
                ]
            };

            const property = configLoader.createProperty(config) as SelectProperty;

            expect(property).toBeInstanceOf(SelectProperty);
            expect(property.options.length).toBe(3);
            expect(property.options[0].name).toBe('Option1');
            expect(property.options[0].aliases).toEqual([]);
            expect(property.options[2].aliases).toEqual(['opt3']);
        });
    });

    describe('MultiSelectProperty with aliases from YAML', () => {
        it('should parse MultiSelectProperty options with aliases in YAML object format', () => {
            const config = {
                type: 'MultiSelectProperty',
                options: [
                    { 'Management': ['management'] },
                    'Technique',
                    { 'Communication': ['com'] },
                    'Vente'
                ]
            };

            const property = configLoader.createProperty(config) as MultiSelectProperty;

            expect(property).toBeInstanceOf(MultiSelectProperty);
            expect(property.options.length).toBe(4);
            
            // First option with aliases
            expect(property.options[0].name).toBe('Management');
            expect(property.options[0].aliases).toEqual(['management']);
            
            // Second option without aliases
            expect(property.options[1].name).toBe('Technique');
            expect(property.options[1].aliases).toEqual([]);
            
            // Third option with aliases
            expect(property.options[2].name).toBe('Communication');
            expect(property.options[2].aliases).toEqual(['com']);
            
            // Fourth option without aliases
            expect(property.options[3].name).toBe('Vente');
            expect(property.options[3].aliases).toEqual([]);
        });

        it('should handle empty aliases array', () => {
            const config = {
                type: 'MultiSelectProperty',
                options: [
                    { 'Management': [] },
                    'Technique'
                ]
            };

            const property = configLoader.createProperty(config) as MultiSelectProperty;

            expect(property.options.length).toBe(2);
            expect(property.options[0].aliases).toEqual([]);
            expect(property.options[1].aliases).toEqual([]);
        });
    });

    describe('Normalization behavior', () => {
        it('should normalize aliases when reading SelectProperty', async () => {
            const config = {
                type: 'SelectProperty',
                options: [
                    { 'Management': ['management', 'mgmt'] },
                    'Technique'
                ]
            };

            const property = configLoader.createProperty(config) as SelectProperty;
            
            const mockClasse = {
                getPropertyValue: jest.fn().mockResolvedValue('management')
            };

            const value = await property.read(mockClasse);
            expect(value).toBe('Management');
        });

        it('should normalize aliases when reading MultiSelectProperty', async () => {
            const config = {
                type: 'MultiSelectProperty',
                options: [
                    { 'Management': ['management'] },
                    { 'Technique': ['tech'] },
                    'Communication'
                ]
            };

            const property = configLoader.createProperty(config) as MultiSelectProperty;
            
            const mockClasse = {
                getPropertyValue: jest.fn().mockResolvedValue(['management', 'tech', 'Communication'])
            };

            const value = await property.read(mockClasse);
            expect(value).toEqual(['Management', 'Technique', 'Communication']);
        });

        it('should deduplicate when multiple aliases map to same canonical name', async () => {
            const config = {
                type: 'MultiSelectProperty',
                options: [
                    { 'Management': ['management', 'mgmt', 'manager'] }
                ]
            };

            const property = configLoader.createProperty(config) as MultiSelectProperty;
            
            const mockClasse = {
                getPropertyValue: jest.fn().mockResolvedValue(['management', 'mgmt', 'Management'])
            };

            const value = await property.read(mockClasse);
            expect(value).toEqual(['Management']);
        });
    });
});
