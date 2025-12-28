import { DisplayRenderer } from '../../src/display/DisplayRenderer';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { mockApp } from '../utils/mocks';

describe('ObjectProperty Display Integration Test', () => {
    let vault: Vault;
    let app: any;

    beforeEach(() => {
        app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);
    });

    test('should create proper table display for Entreprise.employes notation', async () => {
        console.log('🧪 Testing Entreprise.employes table display...');

        // Mock Entreprise instances
        const techInnovate = createEntrepriseInstance('TechInnovate SARL', {
            employes: [
                { nom: 'Dupont', prenom: 'Jean', poste: 'Développeur Senior', salaire: 55000, dateEmbauche: '2022-01-15' },
                { nom: 'Martin', prenom: 'Sophie', poste: 'Chef de Projet', salaire: 65000, dateEmbauche: '2021-03-10' },
                { nom: 'Moreau', prenom: 'Marie', poste: 'Développeur Junior', salaire: 35000, dateEmbauche: '2024-02-12' }
            ],
            projets: [
                { nom: 'Application Mobile CRM', budget: 150000, dateDebut: '2024-01-01', statut: 'En cours' }
            ]
        });

        const designStudio = createEntrepriseInstance('DesignStudio Pro', {
            employes: [
                { nom: 'Leroy', prenom: 'Claire', poste: 'Directrice Créative', salaire: 70000, dateEmbauche: '2020-05-20' },
                { nom: 'Bernard', prenom: 'Lucas', poste: 'Graphiste', salaire: 42000, dateEmbauche: '2022-09-15' }
            ],
            projets: [
                { nom: 'Campagne Publicitaire Été', budget: 45000, dateDebut: '2024-05-01', statut: 'En cours' }
            ]
        });

        // Mock factory
        const mockFactory = {
            getAllInstancesForClass: jest.fn().mockResolvedValue([techInnovate, designStudio])
        };
        vault.getDynamicClassFactory = jest.fn().mockReturnValue(mockFactory);

        // Create renderer
        const renderer = new DisplayRenderer(vault, {}, [], async () => {});

        // Test table display configuration
        const tableConfig = {
            type: 'table',
            title: 'Tous les employés',
            source: {
                class: 'Entreprise.employes',  // ← Nouvelle notation
                smartFilter: 'all',
                conditions: [
                    { property: 'salaire', type: 'greaterThan', value: 40000 }
                ]
            },
            columns: [
                { property: '_fileName', label: 'Entreprise', width: 150 },
                { property: 'nom', label: 'Nom', width: 100 },
                { property: 'prenom', label: 'Prénom', width: 100 },
                { property: 'poste', label: 'Poste', width: 180 },
                { property: 'salaire', label: 'Salaire', width: 100 }
            ]
        };

        // Mock condition manager
        vault.conditionManager = {
            createValidationFunction: jest.fn().mockImplementation(() => {
                return async (item: any) => {
                    const salaireProp = item.getProperty('salaire');
                    const salaire = await salaireProp.read();
                    return salaire > 40000;
                };
            })
        } as any;

        // Get files using the new notation
        const files = await (renderer as any).getFilesForTable(tableConfig.source);

        console.log(`📊 Found ${files.length} employee entries`);
        
        // Should have filtered employees (salary > 40000)
        expect(files.length).toBe(4); // Jean(55k), Sophie(65k), Claire(70k), Lucas(42k)
        
        // Verify pseudo-instance structure
        const firstEmployee = files[0];
        expect(firstEmployee._isObjectPropertyItem).toBe(true);
        expect(firstEmployee._parentInstance).toBeDefined();
        expect(firstEmployee._objectData).toBeDefined();
        
        // Test getName format
        expect(firstEmployee.getName()).toMatch(/^(TechInnovate SARL|DesignStudio Pro)\.employes\[\d+\]$/);
        
        // Test property access
        const nomProp = firstEmployee.getProperty('nom');
        expect(nomProp).toBeDefined();
        
        const nomValue = await nomProp.read();
        expect(typeof nomValue).toBe('string');
        expect(nomValue.length).toBeGreaterThan(0);
        
        // Test special properties
        const fileNameProp = firstEmployee.getProperty('_fileName');
        const fileName = await fileNameProp.read();
        expect(fileName).toMatch(/^(TechInnovate SARL|DesignStudio Pro)\.employes\[\d+\]$/);

        console.log('✅ Entreprise.employes table display working correctly!');
    });

    test('should create proper table display for Entreprise.projets notation', async () => {
        console.log('🧪 Testing Entreprise.projets table display...');

        const techInnovate = createEntrepriseInstance('TechInnovate SARL', {
            employes: [],
            projets: [
                { nom: 'Application Mobile CRM', budget: 150000, dateDebut: '2024-01-01', statut: 'En cours' },
                { nom: 'Site Web Vitrine', budget: 25000, dateDebut: '2023-11-15', statut: 'Terminé' }
            ]
        });

        const designStudio = createEntrepriseInstance('DesignStudio Pro', {
            employes: [],
            projets: [
                { nom: 'Campagne Publicitaire Été', budget: 45000, dateDebut: '2024-05-01', statut: 'En cours' },
                { nom: 'Branding Startup', budget: 18000, dateDebut: '2024-04-01', statut: 'En attente' }
            ]
        });

        const mockFactory = {
            getAllInstancesForClass: jest.fn().mockResolvedValue([techInnovate, designStudio])
        };
        vault.getDynamicClassFactory = jest.fn().mockReturnValue(mockFactory);

        const renderer = new DisplayRenderer(vault, {}, [], async () => {});

        const tableConfig = {
            source: {
                class: 'Entreprise.projets',  // ← Nouvelle notation
                smartFilter: 'all'
            }
        };

        const files = await (renderer as any).getFilesForTable(tableConfig.source);

        console.log(`📋 Found ${files.length} project entries`);
        
        expect(files.length).toBe(4); // 2 projets de TechInnovate + 2 projets de DesignStudio
        
        // Test project properties
        const firstProject = files[0];
        expect(firstProject._propertyName).toBe('projets');
        
        const nomProp = firstProject.getProperty('nom');
        const projectName = await nomProp.read();
        expect(typeof projectName).toBe('string');
        
        const budgetProp = firstProject.getProperty('budget');
        const budget = await budgetProp.read();
        expect(typeof budget).toBe('number');

        console.log('✅ Entreprise.projets table display working correctly!');
    });

    test('should render complete table element for ObjectProperty items', async () => {
        console.log('🧪 Testing complete table rendering...');

        const techInnovate = createEntrepriseInstance('TechInnovate SARL', {
            employes: [
                { nom: 'Dupont', prenom: 'Jean', poste: 'Développeur Senior', salaire: 55000 }
            ],
            projets: []
        });

        const mockFactory = {
            getAllInstancesForClass: jest.fn().mockResolvedValue([techInnovate])
        };
        vault.getDynamicClassFactory = jest.fn().mockReturnValue(mockFactory);

        const renderer = new DisplayRenderer(vault, {}, [], async () => {});

        const tableItem = {
            type: 'table',
            title: 'Test Table',
            source: {
                class: 'Entreprise.employes',
                smartFilter: 'all'
            },
            columns: [
                { property: 'nom', label: 'Nom' },
                { property: 'poste', label: 'Poste' }
            ]
        };

        // Render the complete table element
        const tableElement = await (renderer as any).renderTable(tableItem);
        
        expect(tableElement).toBeDefined();
        expect(tableElement.tagName).toBe('DIV');
        expect(tableElement.classList.contains('metadata-table-container')).toBe(true);
        
        // Should contain title
        const title = tableElement.querySelector('.container-section-title');
        expect(title?.textContent).toBe('Test Table');

        console.log('✅ Complete table rendering working correctly!');
    });

    function createEntrepriseInstance(name: string, data: any): any {
        return {
            getName: () => name,
            getPath: () => name,
            name: 'Entreprise',
            getProperty: jest.fn().mockImplementation((propName: string) => {
                if (propName === 'employes' || propName === 'projets') {
                    return {
                        type: 'object',
                        read: jest.fn().mockResolvedValue(data[propName] || [])
                    };
                }
                return null;
            })
        };
    }
});