import { ConditionManager, Condition } from '../../src/Config/ConditionManager';
import { Classe } from '../../src/vault/Classe';
import { Property } from '../../src/properties/Property';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('ConditionManager - Validation Function', () => {
    let conditionManager: ConditionManager;
    let mockClasseInstance: Classe;
    let vault: Vault;

    beforeEach(() => {
        conditionManager = new ConditionManager();
        const app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
        
        // Create mock classe instance
        mockClasseInstance = {
            getProperty: jest.fn(),
            getPropertyValue: jest.fn(),
        } as any;
    });

    describe('createValidationFunction', () => {
        test('should return a function', () => {
            const conditions: Condition[] = [];
            const validationFn = conditionManager.createValidationFunction(conditions);
            
            expect(typeof validationFn).toBe('function');
        });

        test('should return true for empty conditions', async () => {
            const conditions: Condition[] = [];
            const validationFn = conditionManager.createValidationFunction(conditions);
            
            const result = await validationFn(mockClasseInstance);
            
            expect(result).toBe(true);
        });

        test('should validate equals condition correctly', async () => {
            const statusProperty = new Property('status', vault);
            statusProperty.read = jest.fn().mockResolvedValue('active');
            
            (mockClasseInstance.getProperty as jest.Mock).mockReturnValue(statusProperty);

            const conditions: Condition[] = [
                { property: 'status', type: 'equals', value: 'active' }
            ];
            
            const validationFn = conditionManager.createValidationFunction(conditions);
            const result = await validationFn(mockClasseInstance);
            
            expect(result).toBe(true);
        });

        test('should return false when equals condition fails', async () => {
            const statusProperty = new Property('status', vault);
            statusProperty.read = jest.fn().mockResolvedValue('inactive');
            
            (mockClasseInstance.getProperty as jest.Mock).mockReturnValue(statusProperty);

            const conditions: Condition[] = [
                { property: 'status', type: 'equals', value: 'active' }
            ];
            
            const validationFn = conditionManager.createValidationFunction(conditions);
            const result = await validationFn(mockClasseInstance);
            
            expect(result).toBe(false);
        });

        test('should validate multiple conditions with AND logic', async () => {
            const statusProperty = new Property('status', vault);
            statusProperty.read = jest.fn().mockResolvedValue('active');
            
            const typeProperty = new Property('type', vault);
            typeProperty.read = jest.fn().mockResolvedValue('Institution');
            
            (mockClasseInstance.getProperty as jest.Mock).mockImplementation((name: string) => {
                if (name === 'status') return statusProperty;
                if (name === 'type') return typeProperty;
                return null;
            });

            const conditions: Condition[] = [
                { property: 'status', type: 'equals', value: 'active' },
                { property: 'type', type: 'equals', value: 'Institution' }
            ];
            
            const validationFn = conditionManager.createValidationFunction(conditions);
            const result = await validationFn(mockClasseInstance);
            
            expect(result).toBe(true);
        });

        test('should return false when one of multiple conditions fails', async () => {
            const statusProperty = new Property('status', vault);
            statusProperty.read = jest.fn().mockResolvedValue('active');
            
            const typeProperty = new Property('type', vault);
            typeProperty.read = jest.fn().mockResolvedValue('Personne');
            
            (mockClasseInstance.getProperty as jest.Mock).mockImplementation((name: string) => {
                if (name === 'status') return statusProperty;
                if (name === 'type') return typeProperty;
                return null;
            });

            const conditions: Condition[] = [
                { property: 'status', type: 'equals', value: 'active' },
                { property: 'type', type: 'equals', value: 'Institution' }
            ];
            
            const validationFn = conditionManager.createValidationFunction(conditions);
            const result = await validationFn(mockClasseInstance);
            
            expect(result).toBe(false);
        });

        test('should validate equalsAny condition', async () => {
            const typeProperty = new Property('type', vault);
            typeProperty.read = jest.fn().mockResolvedValue('Institution');
            
            (mockClasseInstance.getProperty as jest.Mock).mockReturnValue(typeProperty);

            const conditions: Condition[] = [
                { property: 'type', type: 'equalsAny', values: ['Institution', 'Lieu'] }
            ];
            
            const validationFn = conditionManager.createValidationFunction(conditions);
            const result = await validationFn(mockClasseInstance);
            
            expect(result).toBe(true);
        });

        test('should validate isEmpty condition', async () => {
            const descriptionProperty = new Property('description', vault);
            descriptionProperty.read = jest.fn().mockResolvedValue('');
            
            (mockClasseInstance.getProperty as jest.Mock).mockReturnValue(descriptionProperty);

            const conditions: Condition[] = [
                { property: 'description', type: 'isEmpty' }
            ];
            
            const validationFn = conditionManager.createValidationFunction(conditions);
            const result = await validationFn(mockClasseInstance);
            
            expect(result).toBe(true);
        });

        test('should validate isNotEmpty condition', async () => {
            const descriptionProperty = new Property('description', vault);
            descriptionProperty.read = jest.fn().mockResolvedValue('Some description');
            
            (mockClasseInstance.getProperty as jest.Mock).mockReturnValue(descriptionProperty);

            const conditions: Condition[] = [
                { property: 'description', type: 'isNotEmpty' }
            ];
            
            const validationFn = conditionManager.createValidationFunction(conditions);
            const result = await validationFn(mockClasseInstance);
            
            expect(result).toBe(true);
        });

        test('should validate contains condition for strings', async () => {
            const nameProperty = new Property('name', vault);
            nameProperty.read = jest.fn().mockResolvedValue('Paris City');
            
            (mockClasseInstance.getProperty as jest.Mock).mockReturnValue(nameProperty);

            const conditions: Condition[] = [
                { property: 'name', type: 'contains', value: 'Paris' }
            ];
            
            const validationFn = conditionManager.createValidationFunction(conditions);
            const result = await validationFn(mockClasseInstance);
            
            expect(result).toBe(true);
        });

        test('should validate greaterThan condition', async () => {
            const populationProperty = new Property('population', vault);
            populationProperty.read = jest.fn().mockResolvedValue(50000);
            
            (mockClasseInstance.getProperty as jest.Mock).mockReturnValue(populationProperty);

            const conditions: Condition[] = [
                { property: 'population', type: 'greaterThan', value: 10000 }
            ];
            
            const validationFn = conditionManager.createValidationFunction(conditions);
            const result = await validationFn(mockClasseInstance);
            
            expect(result).toBe(true);
        });
    });
});
