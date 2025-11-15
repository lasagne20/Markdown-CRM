import { PhoneProperty } from '../../src/properties/PhoneProperty';
import { Vault } from '../../src/vault/Vault';

describe('PhoneProperty - Type Safety', () => {
    let property: PhoneProperty;
    let mockVault: Vault;
    let mockApp: any;

    beforeEach(() => {
        mockApp = {
            setIcon: jest.fn(),
            getUrl: jest.fn(),
            readFile: jest.fn(),
            writeFile: jest.fn(),
            getMetadata: jest.fn(),
            updateMetadata: jest.fn(),
            getFile: jest.fn(),
            createFile: jest.fn(),
            listFiles: jest.fn().mockResolvedValue([]),
            waitForFileMetaDataUpdate: jest.fn(),
            selectFile: jest.fn(),
            open: jest.fn(),
            getSettings: jest.fn().mockReturnValue({ phoneFormat: 'FR' })
        };

        mockVault = new Vault(mockApp, { vaultPath: './test-vault' } as any);
        property = new PhoneProperty('telephone', mockVault);
    });

    describe('getLink', () => {
        it('should handle valid phone number string', () => {
            const result = property.getLink('01 48 70 60 00');
            expect(result).toBe('callto:0148706000');
        });

        it('should handle phone number with international prefix', () => {
            const result = property.getLink('+33 1 48 70 60 00');
            expect(result).toBe('callto:+33148706000');
        });

        it('should handle null value gracefully', () => {
            const result = property.getLink(null as any);
            expect(result).toBe('callto:');
        });

        it('should handle undefined value gracefully', () => {
            const result = property.getLink(undefined as any);
            expect(result).toBe('callto:');
        });

        it('should handle empty string', () => {
            const result = property.getLink('');
            expect(result).toBe('callto:');
        });

        it('should handle non-string types (number)', () => {
            const result = property.getLink(123456789 as any);
            expect(result).toBe('callto:');
        });

        it('should handle non-string types (object)', () => {
            const result = property.getLink({ phone: '0148706000' } as any);
            expect(result).toBe('callto:');
        });

        it('should handle non-string types (array)', () => {
            const result = property.getLink(['0148706000'] as any);
            expect(result).toBe('callto:');
        });
    });

    describe('getPretty', () => {
        it('should format valid 10-digit French phone number', () => {
            const result = property.getPretty('0148706000');
            expect(result).toBe('01.48.70.60.00');
        });

        it('should handle phone number with spaces', () => {
            const result = property.getPretty('01 48 70 60 00');
            expect(result).toBe('01.48.70.60.00');
        });

        it('should handle null value gracefully', () => {
            const result = property.getPretty(null as any);
            expect(result).toBe('');
        });

        it('should handle undefined value gracefully', () => {
            const result = property.getPretty(undefined as any);
            expect(result).toBe('');
        });

        it('should handle empty string', () => {
            const result = property.getPretty('');
            expect(result).toBe('');
        });

        it('should handle non-string types (number)', () => {
            const result = property.getPretty(123456789 as any);
            expect(result).toBe('');
        });

        it('should handle non-string types (object)', () => {
            const result = property.getPretty({ phone: '0148706000' } as any);
            expect(result).toBe('');
        });

        it('should handle non-string types (array)', () => {
            const result = property.getPretty(['0148706000'] as any);
            expect(result).toBe('');
        });

        it('should return empty string for invalid phone number length', () => {
            const result = property.getPretty('123');
            expect(result).toBe('');
        });

        it('should handle international format and convert to French', () => {
            const result = property.getPretty('+33148706000');
            expect(result).toBe('01.48.70.60.00');
        });
    });

    describe('validate', () => {
        it('should validate and format correct phone number', () => {
            const result = property.validate('01 48 70 60 00');
            expect(result).toBe('01.48.70.60.00');
        });

        it('should handle null gracefully', () => {
            const result = property.validate(null as any);
            expect(result).toBe('');
        });

        it('should handle undefined gracefully', () => {
            const result = property.validate(undefined as any);
            expect(result).toBe('');
        });

        it('should reject invalid phone numbers', () => {
            const result = property.validate('123');
            expect(result).toBe('');
        });
    });
});
