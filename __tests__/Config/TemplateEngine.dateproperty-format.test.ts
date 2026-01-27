/**
 * Test pour vérifier que {date} dans les templates utilise toujours le format YYYY-MM-DD
 * et non le format d'affichage "lundi 26 février 2025"
 */

import { TemplateEngine } from '../../src/Config/TemplateEngine';
import { Classe } from '../../src/vault/Classe';
import { DateProperty } from '../../src/properties/DateProperty';

describe('TemplateEngine - DateProperty Format in Templates', () => {
    let mockVault: any;

    beforeEach(() => {
        mockVault = {
            app: {
                setIcon: jest.fn(),
                getMetadata: jest.fn()
            }
        };
    });

    test('should use YYYY-MM-DD format for {date} in RenameFileAction template', async () => {
        console.log('🧪 Testing DateProperty in template "{date} - {current}"...');

        const mockFile = {
            basename: 'Note',
            getMetadata: jest.fn().mockResolvedValue({
                date: '2026-01-27'
            })
        } as any;

        mockVault.app.getMetadata.mockResolvedValue({
            date: '2026-01-27'
        });

        const dateProperty = new DateProperty('date', mockVault);
        const instance = new Classe(mockVault, mockFile);
        
        // Mock getProperty to return our DateProperty
        instance.getProperty = jest.fn((name: string) => {
            if (name === 'date') return dateProperty;
            return undefined;
        });

        const result = await TemplateEngine.processTemplateFromInstance(
            '{date} - {current}',
            instance,
            'Note'
        );

        // Should use raw YYYY-MM-DD format, not "lundi 27 janvier 2026"
        expect(result).toBe('2026-01-27 - Note');
        console.log(`✅ Result: "${result}"`);
    });

    test('should preserve YYYY-MM-DD format even when DateProperty.getPretty returns formatted date', async () => {
        console.log('🧪 Testing that getPretty is not called for DateProperty...');

        const mockFile = {
            basename: 'TestFile',
            getMetadata: jest.fn().mockResolvedValue({
                date: '2026-06-07'
            })
        } as any;

        mockVault.app.getMetadata.mockResolvedValue({
            date: '2026-06-07'
        });

        const dateProperty = new DateProperty('date', mockVault);
        const instance = new Classe(mockVault, mockFile);
        
        instance.getProperty = jest.fn((name: string) => {
            if (name === 'date') return dateProperty;
            return undefined;
        });

        const result = await TemplateEngine.processTemplateFromInstance(
            '{date} - Note',
            instance
        );

        // Should be YYYY-MM-DD, not "dimanche 7 juin 2026"
        expect(result).toBe('2026-06-07 - Note');
        expect(result).not.toContain('juin');
        expect(result).not.toContain('dimanche');
        
        console.log(`✅ Result correctly uses raw format: "${result}"`);
        console.log(`✅ getPretty would return: "${dateProperty.getPretty('2026-06-07')}"`);
    });

    test('should handle defaultValue: "today" in template', async () => {
        console.log('🧪 Testing template with today date...');

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const mockFile = {
            basename: 'Note',
            getMetadata: jest.fn().mockResolvedValue({
                date: todayStr
            })
        } as any;

        mockVault.app.getMetadata.mockResolvedValue({
            date: todayStr
        });

        const dateProperty = new DateProperty('date', mockVault, [], { default: 'today' });
        const instance = new Classe(mockVault, mockFile);
        
        instance.getProperty = jest.fn((name: string) => {
            if (name === 'date') return dateProperty;
            return undefined;
        });

        const result = await TemplateEngine.processTemplateFromInstance(
            '{date} - {current}',
            instance,
            'Note'
        );

        // Should match YYYY-MM-DD format
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2} - Note$/);
        expect(result).toBe(`${todayStr} - Note`);
        
        console.log(`✅ Today date correctly formatted: "${result}"`);
    });

    test('should work in ProcessManager RenameFileAction scenario', async () => {
        console.log('🧪 Testing full ProcessManager RenameFileAction scenario...');

        const mockFile = {
            basename: 'Ancienne Note',
            getMetadata: jest.fn().mockResolvedValue({
                date: '2026-01-27',
                type: 'Note'
            })
        } as any;

        mockVault.app.getMetadata.mockResolvedValue({
            date: '2026-01-27',
            type: 'Note'
        });

        const dateProperty = new DateProperty('date', mockVault);
        const instance = new Classe(mockVault, mockFile);
        
        instance.getProperty = jest.fn((name: string) => {
            if (name === 'date') return dateProperty;
            return undefined;
        });

        // Simulate RenameFileAction template: "{date} - {current}"
        const result = await TemplateEngine.processTemplateFromInstance(
            '{date} - {current}',
            instance,
            'Ancienne Note'
        );

        // Expected: "2026-01-27 - Ancienne Note"
        // NOT: "lundi 27 janvier 2026 - Ancienne Note"
        expect(result).toBe('2026-01-27 - Ancienne Note');
        expect(result).not.toContain('lundi');
        expect(result).not.toContain('janvier');
        
        console.log(`✅ RenameFileAction template result: "${result}"`);
    });

    test('DateProperty.getPretty should still return formatted date for display', () => {
        console.log('🧪 Verifying DateProperty.getPretty returns formatted date...');

        const dateProperty = new DateProperty('date', mockVault);
        const prettyDate = dateProperty.getPretty('2026-06-07');

        // getPretty should return formatted date for UI display
        expect(prettyDate).toContain('juin');
        expect(prettyDate).toContain('2026');
        
        console.log(`✅ getPretty correctly returns formatted: "${prettyDate}"`);
    });
});
