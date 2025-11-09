import { Property } from '../../src/properties/Property';

describe('Property - Basic Functionality', () => {
    let property: Property;
    
    beforeEach(() => {
        property = new Property('test', { icon: 'align-left' });
    });
    
    test('should create property with correct name', () => {
        expect(property.name).toBe('test');
        expect(property.icon).toBe('align-left');
    });
    
    test('should validate input correctly', () => {
        const result = property.validate('test input');
        expect(result).toBe('test input');
    });
    
    test('should handle DOM creation safely', () => {
        // Test that createElement works without throwing
        const container = document.createElement('div');
        expect(container).toBeTruthy();
        expect(container.tagName).toBe('DIV');
    });
    
    test('should handle basic field creation', () => {
        const input = property.createFieldInput('test value');
        expect(input).toBeTruthy();
        expect((input as any).tagName).toBe('INPUT');
    });
});
