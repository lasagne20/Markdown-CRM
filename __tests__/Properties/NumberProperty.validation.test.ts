import { NumberProperty } from '../../src/properties/NumberProperty';

describe('NumberProperty - Validation Only', () => {
    let numberProperty: NumberProperty;
    
    beforeEach(() => {
        numberProperty = new NumberProperty('test', 'kg');
    });
    
    test('should validate basic numbers', () => {
        expect(numberProperty.validate('123')).toBe('123');
        expect(numberProperty.validate('123.45')).toBe('123.45');
        expect(numberProperty.validate('0')).toBe('0');
        expect(numberProperty.validate('-50')).toBe('-50');
    });
    
    test('should handle invalid inputs', () => {
        expect(numberProperty.validate('abc')).toBe('');
        expect(numberProperty.validate('12abc')).toBe('');
        expect(numberProperty.validate('')).toBe('');
        expect(numberProperty.validate('   ')).toBe('');
        expect(numberProperty.validate('NaN')).toBe('');
    });
    
    test('should handle scientific notation', () => {
        expect(numberProperty.validate('1e10')).toBe('10000000000');
        expect(numberProperty.validate('1.23e-4')).toBe('0.000123');
        expect(numberProperty.validate('2E+3')).toBe('2000');
    });
    
    test('should handle null and undefined', () => {
        expect(numberProperty.validate(null as any)).toBe('');
        expect(numberProperty.validate(undefined as any)).toBe('');
    });
});
