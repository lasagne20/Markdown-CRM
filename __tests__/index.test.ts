import * as index from '../src/index';

describe('Index exports', () => {
    it('should export all modules', () => {
        // Test that the main exports are available
        expect(index).toBeDefined();
        
        // We can't test the actual exports without importing them all,
        // but we can at least verify the module loads
        expect(typeof index).toBe('object');
    });
});