import { TemplateEngine } from '../../src/Config/TemplateEngine';
import { Classe } from '../../src/vault/Classe';
import { RangeDateProperty } from '../../src/properties/RangeDateProperty';

describe('TemplateEngine - DateRange Property', () => {
    let mockVault: any;

    beforeEach(() => {
        mockVault = {
            app: {
                getMetadata: jest.fn(),
                getSettings: jest.fn().mockReturnValue({})
            }
        };
    });

    it('should extract only the start date from daterange format', async () => {
        const mockFile = {
            basename: 'TestProject',
            getMetadata: jest.fn().mockResolvedValue({
                nom: 'Test Project',
                periode: '2025-01-15/2025-03-20'
            })
        } as any;

        mockVault.app.getMetadata.mockResolvedValue({
            nom: 'Test Project',
            periode: '2025-01-15/2025-03-20'
        });

        const instance = new Classe(mockVault, mockFile);

        // Add RangeDateProperty
        const periodeProperty = new RangeDateProperty('periode', mockVault);
        instance.addProperty(periodeProperty);

        const result = await TemplateEngine.processTemplateFromInstance(
            '{periode} - {nom}',
            instance
        );

        // Should extract only the start date (2025-01-15)
        expect(result).toBe('2025-01-15 - Test Project');
        expect(result).not.toContain('/');
        expect(result).not.toContain('2025-03-20');
    });

    it('should handle daterange in nested properties', async () => {
        const mockFile = {
            basename: 'TestProject',
            getMetadata: jest.fn().mockResolvedValue({
                nom: 'Test Project',
                details: {
                    periode: '2024-06-01/2024-12-31'
                }
            })
        } as any;

        mockVault.app.getMetadata.mockResolvedValue({
            nom: 'Test Project',
            details: {
                periode: '2024-06-01/2024-12-31'
            }
        });

        const instance = new Classe(mockVault, mockFile);

        const result = await TemplateEngine.processTemplateFromInstance(
            '{details.periode} - {nom}',
            instance
        );

        // Should extract only the start date
        expect(result).toBe('2024-06-01 - Test Project');
    });

    it('should handle daterange in array properties', async () => {
        const mockFile = {
            basename: 'TestProject',
            getMetadata: jest.fn().mockResolvedValue({
                nom: 'Multi Phase Project',
                phases: [
                    { periode: '2025-01-01/2025-06-30', nom: 'Phase 1' },
                    { periode: '2025-07-01/2025-12-31', nom: 'Phase 2' }
                ]
            })
        } as any;

        mockVault.app.getMetadata.mockResolvedValue({
            nom: 'Multi Phase Project',
            phases: [
                { periode: '2025-01-01/2025-06-30', nom: 'Phase 1' },
                { periode: '2025-07-01/2025-12-31', nom: 'Phase 2' }
            ]
        });

        const instance = new Classe(mockVault, mockFile);

        const result = await TemplateEngine.processTemplateFromInstance(
            '{phases[0].periode} - {nom}',
            instance
        );

        // Should extract only the start date from first phase
        expect(result).toBe('2025-01-01 - Multi Phase Project');
    });

    it('should handle single date without range separator', async () => {
        const mockFile = {
            basename: 'TestProject',
            getMetadata: jest.fn().mockResolvedValue({
                nom: 'Test Project',
                date: '2025-01-15'
            })
        } as any;

        mockVault.app.getMetadata.mockResolvedValue({
            nom: 'Test Project',
            date: '2025-01-15'
        });

        const instance = new Classe(mockVault, mockFile);

        const result = await TemplateEngine.processTemplateFromInstance(
            '{date} - {nom}',
            instance
        );

        // Should keep the single date as is
        expect(result).toBe('2025-01-15 - Test Project');
    });

    it('should handle empty or invalid daterange', async () => {
        const mockFile = {
            basename: 'TestProject',
            getMetadata: jest.fn().mockResolvedValue({
                nom: 'Test Project',
                periode: ''
            })
        } as any;

        mockVault.app.getMetadata.mockResolvedValue({
            nom: 'Test Project',
            periode: ''
        });

        const instance = new Classe(mockVault, mockFile);

        const result = await TemplateEngine.processTemplateFromInstance(
            '{periode} - {nom}',
            instance
        );

        // Should abort when required value is empty
        expect(result).toBeNull();
    });

    it('should work with getPretty on RangeDateProperty', async () => {
        const mockFile = {
            basename: 'TestProject',
            getMetadata: jest.fn().mockResolvedValue({
                nom: 'Test Project',
                periode: '2025-01-15/2025-03-20'
            })
        } as any;

        mockVault.app.getMetadata.mockResolvedValue({
            nom: 'Test Project',
            periode: '2025-01-15/2025-03-20'
        });

        const instance = new Classe(mockVault, mockFile);

        // Add RangeDateProperty with getPretty
        const periodeProperty = new RangeDateProperty('periode', mockVault);
        instance.addProperty(periodeProperty);

        const result = await TemplateEngine.processTemplateFromInstance(
            'Project {periode}',
            instance
        );

        // getPretty should return the start date
        expect(result).toBe('Project 2025-01-15');
    });
});
