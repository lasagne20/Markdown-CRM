import { IdProperty } from '../../src/properties/IdProperty';
import { Vault } from '../../src/vault/Vault';
import { IApp, IFile, ISettings } from '../../src/interfaces/IApp';

// Simple mock app for testing IdProperty
class MockApp implements Partial<IApp> {
    private metadata: Map<string, Record<string, any>> = new Map();

    getSettings(): ISettings {
        return {
            phoneFormat: 'FR',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '24h',
            timezone: 'Europe/Paris',
            numberLocale: 'fr-FR',
            currencySymbol: '€'
        };
    }

    async getMetadata(file: IFile): Promise<Record<string, any>> {
        return this.metadata.get(file.path) || {};
    }

    async updateMetadata(file: IFile, data: Record<string, any>): Promise<void> {
        this.metadata.set(file.path, { ...this.metadata.get(file.path), ...data });
    }
}

describe('IdProperty', () => {
    let vault: Vault;
    let mockApp: MockApp;

    beforeEach(() => {
        mockApp = new MockApp();
        vault = { app: mockApp } as any; // Minimal vault for testing
    });

    describe('UUID Generation', () => {
        test('should generate a valid UUID v4 format', () => {
            const idProp = new IdProperty('id', vault);
            const uuid = (idProp as any).generateUUID();

            // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            expect(uuid).toMatch(uuidRegex);
        });

        test('should generate unique UUIDs', () => {
            const idProp = new IdProperty('id', vault);
            const uuid1 = (idProp as any).generateUUID();
            const uuid2 = (idProp as any).generateUUID();

            expect(uuid1).not.toBe(uuid2);
        });
    });

    describe('Property Configuration', () => {
        test('should have type "id"', () => {
            const idProp = new IdProperty('id', vault);
            expect(idProp.type).toBe('id');
        });

        test('should be static by default', () => {
            const idProp = new IdProperty('id', vault);
            expect(idProp.static).toBe(true);
        });

        test('should allow non-static configuration', () => {
            const idProp = new IdProperty('id', vault, { staticProperty: false });
            expect(idProp.static).toBe(false);
        });

        test('should use "hash" icon by default', () => {
            const idProp = new IdProperty('id', vault);
            expect(idProp.icon).toBe('hash');
        });
    });

    describe('read() method', () => {
        test('should generate UUID if property has no value', async () => {
            const idProp = new IdProperty('id', vault);
            
            // Mock classe with no value
            const mockClasse = {
                getPropertyValue: jest.fn().mockResolvedValue(undefined),
                updatePropertyValue: jest.fn().mockResolvedValue(undefined)
            };

            const value = await idProp.read(mockClasse);

            expect(value).toBeTruthy();
            expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            expect(mockClasse.updatePropertyValue).toHaveBeenCalledWith('id', value);
        });

        test('should return existing UUID if already set', async () => {
            const existingUuid = '550e8400-e29b-41d4-a716-446655440000';
            const idProp = new IdProperty('id', vault);
            
            const mockClasse = {
                getPropertyValue: jest.fn().mockResolvedValue(existingUuid),
                updatePropertyValue: jest.fn()
            };
            
            const value = await idProp.read(mockClasse);
            expect(value).toBe(existingUuid);
            expect(mockClasse.updatePropertyValue).not.toHaveBeenCalled();
        });

        test('should generate new UUID if value is empty string', async () => {
            const idProp = new IdProperty('id', vault);
            
            const mockClasse = {
                getPropertyValue: jest.fn().mockResolvedValue(''),
                updatePropertyValue: jest.fn().mockResolvedValue(undefined)
            };
            
            const value = await idProp.read(mockClasse);
            expect(value).toBeTruthy();
            expect(value).not.toBe('');
            expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            expect(mockClasse.updatePropertyValue).toHaveBeenCalledWith('id', value);
        });

        test('should maintain same UUID across multiple reads', async () => {
            let storedValue: string | undefined;
            const idProp = new IdProperty('id', vault);
            
            const mockClasse = {
                getPropertyValue: jest.fn(async () => storedValue),
                updatePropertyValue: jest.fn(async (name: string, value: string) => {
                    storedValue = value;
                })
            };
            
            const value1 = await idProp.read(mockClasse);
            const value2 = await idProp.read(mockClasse);
            const value3 = await idProp.read(mockClasse);

            expect(value1).toBe(value2);
            expect(value2).toBe(value3);
        });
    });

    describe('validate() method', () => {
        test('should accept valid UUID', () => {
            const idProp = new IdProperty('id', vault);
            const validUuid = '550e8400-e29b-41d4-a716-446655440000';
            
            const result = idProp.validate(validUuid);
            expect(result).toBe(validUuid);
        });

        test('should generate new UUID for invalid format', () => {
            const idProp = new IdProperty('id', vault);
            const invalidUuid = 'not-a-uuid';
            
            const result = idProp.validate(invalidUuid);
            expect(result).not.toBe(invalidUuid);
            expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        test('should generate new UUID for empty string', () => {
            const idProp = new IdProperty('id', vault);
            
            const result = idProp.validate('');
            expect(result).toBeTruthy();
            expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        test('should be case-insensitive for UUID validation', () => {
            const idProp = new IdProperty('id', vault);
            const upperCaseUuid = '550E8400-E29B-41D4-A716-446655440000';
            
            const result = idProp.validate(upperCaseUuid);
            expect(result).toBe(upperCaseUuid);
        });
    });

    describe('getDefaultValue() method', () => {
        test('should return a valid UUID', () => {
            const idProp = new IdProperty('id', vault);
            const defaultValue = idProp.getDefaultValue();

            expect(defaultValue).toBeTruthy();
            expect(defaultValue).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        test('should return different UUIDs on each call', () => {
            const idProp = new IdProperty('id', vault);
            const value1 = idProp.getDefaultValue();
            const value2 = idProp.getDefaultValue();

            expect(value1).not.toBe(value2);
        });
    });

    describe('UI Creation Methods', () => {
        test('createFieldInput should create disabled input when static', () => {
            const idProp = new IdProperty('id', vault, { staticProperty: true });
            const testUuid = '550e8400-e29b-41d4-a716-446655440000';
            
            const input = idProp.createFieldInput(testUuid);

            expect(input.type).toBe('text');
            expect(input.value).toBe(testUuid);
            expect(input.disabled).toBe(true);
            expect(input.classList.contains('id-field')).toBe(true);
        });

        test('createFieldInput should create enabled input when not static', () => {
            const idProp = new IdProperty('id', vault, { staticProperty: false });
            const testUuid = '550e8400-e29b-41d4-a716-446655440000';
            
            const input = idProp.createFieldInput(testUuid);

            expect(input.disabled).toBe(false);
        });

        test('createFieldInput should generate UUID if value is empty', () => {
            const idProp = new IdProperty('id', vault);
            
            const input = idProp.createFieldInput('');

            expect(input.value).toBeTruthy();
            expect(input.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        test('createFieldLink should display UUID in monospace font', () => {
            const idProp = new IdProperty('id', vault);
            const testUuid = '550e8400-e29b-41d4-a716-446655440000';
            
            const link = idProp.createFieldLink(testUuid);

            expect(link.textContent).toBe(testUuid);
            expect(link.style.fontFamily).toBe('monospace');
            expect(link.classList.contains('id-field-link')).toBe(true);
        });

        test('createFieldContainer should create appropriate container', () => {
            const idProp = new IdProperty('id', vault);
            
            const container = idProp.createFieldContainer();

            expect(container.classList.contains('metadata-textfield')).toBe(true);
            expect(container.classList.contains('id-field-container')).toBe(true);
        });
    });

    describe('Aliases Support', () => {
        test('should support aliases configuration', () => {
            const idProp = new IdProperty('id', vault, { 
                aliases: ['uuid', 'identifier'] 
            });

            expect(idProp.aliases).toEqual(['uuid', 'identifier']);
        });
    });
});
