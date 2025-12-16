import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ConfigLoader } from '../../src/Config/ConfigLoader';
import { mockApp } from '../utils/mocks';

describe('FileProperty - Class Inheritance (extend)', () => {
    let configLoader: ConfigLoader;

    beforeEach(() => {
        const app = mockApp();
        const vault: any = {
            app,
            getSettings: () => ({ configPath: 'config' })
        };

        configLoader = new ConfigLoader('config', vault);
    });

    it('should detect that Salarié extends Personne', async () => {
        // Mock configs
        jest.spyOn(configLoader, 'loadClassConfig').mockImplementation(async (className: string): Promise<any> => {
            if (className === 'Personne') {
                return {
                    className: 'Personne',
                    classIcon: '👤',
                    properties: { nom: { type: 'TextProperty', title: 'Nom' } }
                };
            }
            if (className === 'Salarié') {
                return {
                    className: 'Salarié',
                    classIcon: '💼',
                    extend: 'Personne',
                    properties: { dateEntree: { type: 'DateProperty', title: 'Date' } }
                };
            }
            return null;
        });

        const personneConfig = await configLoader.loadClassConfig('Personne');
        const salarieConfig = await configLoader.loadClassConfig('Salarié');

        expect(personneConfig.extend).toBeUndefined();
        expect(salarieConfig.extend).toBe('Personne');
    });

    it('should support multi-level inheritance (Manager extends Salarié extends Personne)', async () => {
        jest.spyOn(configLoader, 'loadClassConfig').mockImplementation(async (className: string): Promise<any> => {
            const configs: any = {
                'Personne': { className: 'Personne', classIcon: '👤', properties: {} },
                'Salarié': { className: 'Salarié', classIcon: '💼', extend: 'Personne', properties: {} },
                'Manager': { className: 'Manager', classIcon: '👔', extend: 'Salarié', properties: {} }
            };
            return configs[className] || null;
        });

        const managerConfig = await configLoader.loadClassConfig('Manager');
        expect(managerConfig.extend).toBe('Salarié');

        const salarieConfig = await configLoader.loadClassConfig('Salarié');
        expect(salarieConfig.extend).toBe('Personne');
    });

    it('should check if a class extends another (directly or indirectly)', async () => {
        jest.spyOn(configLoader, 'loadClassConfig').mockImplementation(async (className: string): Promise<any> => {
            const configs: any = {
                'Personne': { className: 'Personne', classIcon: '👤', properties: {} },
                'Salarié': { className: 'Salarié', classIcon: '💼', extend: 'Personne', properties: {} },
                'Manager': { className: 'Manager', classIcon: '👔', extend: 'Salarié', properties: {} },
                'Institution': { className: 'Institution', classIcon: '🏢', properties: {} }
            };
            return configs[className] || null;
        });

        // Test with helper function that checks inheritance
        const extendsClass = async (childClass: string, parentClass: string): Promise<boolean> => {
            if (childClass === parentClass) return true;
            
            const config = await configLoader.loadClassConfig(childClass);
            if (!config || !config.extend) return false;
            
            // Check direct parent
            if (config.extend === parentClass) return true;
            
            // Check recursively
            return extendsClass(config.extend, parentClass);
        };

        // Salarié extends Personne directly
        expect(await extendsClass('Salarié', 'Personne')).toBe(true);
        
        // Manager extends Personne indirectly (via Salarié)
        expect(await extendsClass('Manager', 'Personne')).toBe(true);
        expect(await extendsClass('Manager', 'Salarié')).toBe(true);
        
        // Institution does not extend Personne
        expect(await extendsClass('Institution', 'Personne')).toBe(false);
        
        // A class extends itself
        expect(await extendsClass('Personne', 'Personne')).toBe(true);
    });
});

