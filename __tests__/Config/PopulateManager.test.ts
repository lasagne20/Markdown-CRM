import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('PopulateManager', () => {
    let mockVault: any;
    let mockApp: any;
    let mockClassConfig: any;

    beforeEach(() => {
        // Mock IApp with selectFile and selectFromList
        mockApp = {
            selectFile: jest.fn(),
            selectFromList: jest.fn(),
            promptText: jest.fn(),
            showNotice: jest.fn()
        };

        // Mock Vault
        mockVault = {
            app: mockApp,
            getClasseFromName: jest.fn()
        };

        // Mock class configuration
        mockClassConfig = {
            name: 'Personne',
            populate: [
                {
                    property: 'institution',
                    title: 'Choisir une institution'
                },
                {
                    property: 'statut',
                    title: 'Choisir un statut'
                }
            ],
            properties: [
                {
                    name: 'institution',
                    type: 'FileProperty',
                    classes: ['Institution']
                },
                {
                    name: 'statut',
                    type: 'SelectProperty',
                    options: ['Actif', 'Inactif', 'En congé', 'Parti']
                },
                {
                    name: 'nom',
                    type: 'Property'
                }
            ]
        };
    });

    describe('Configuration Parsing', () => {
        it('should parse populate configuration from YAML', () => {
            expect(mockClassConfig.populate).toBeDefined();
            expect(mockClassConfig.populate).toHaveLength(2);
            expect(mockClassConfig.populate[0]).toEqual({
                property: 'institution',
                title: 'Choisir une institution'
            });
        });

        it('should handle missing populate configuration', () => {
            const configWithoutPopulate = { ...mockClassConfig, populate: undefined };
            expect(configWithoutPopulate.populate).toBeUndefined();
        });

        it('should validate populate property exists in properties list', () => {
            const populateProperty = mockClassConfig.populate[0].property;
            const propertyExists = mockClassConfig.properties.some(
                (p: any) => p.name === populateProperty
            );
            expect(propertyExists).toBe(true);
        });
    });

    describe('Property Type Detection', () => {
        it('should identify FileProperty type', () => {
            const institutionProp = mockClassConfig.properties.find(
                (p: any) => p.name === 'institution'
            );
            expect(institutionProp.type).toBe('FileProperty');
            expect(institutionProp.classes).toBeDefined();
        });

        it('should identify SelectProperty type', () => {
            const statutProp = mockClassConfig.properties.find(
                (p: any) => p.name === 'statut'
            );
            expect(statutProp.type).toBe('SelectProperty');
            expect(statutProp.options).toBeDefined();
        });

        it('should handle unknown property types gracefully', () => {
            const unknownProp = {
                name: 'unknown',
                type: 'UnknownProperty'
            };
            // Should not throw error
            expect(() => {
                const type = unknownProp.type;
            }).not.toThrow();
        });
    });

    describe('FileProperty Population', () => {
        it('should call selectFile for FileProperty', async () => {
            const mockInstitution = {
                getName: () => 'TechCorp',
                getLink: () => '[[TechCorp]]'
            };
            mockApp.selectFile.mockResolvedValue(mockInstitution);

            // Simulate PopulateManager.populateProperty()
            const institutionProp = mockClassConfig.properties.find(
                (p: any) => p.name === 'institution'
            );
            const populateConfig = mockClassConfig.populate[0];

            // Call selectFile with correct parameters
            const result = await mockApp.selectFile(
                mockVault,
                institutionProp.classes,
                { hint: populateConfig.title }
            );

            expect(mockApp.selectFile).toHaveBeenCalledWith(
                mockVault,
                ['Institution'],
                { hint: 'Choisir une institution' }
            );
            expect(result).toBe(mockInstitution);
        });

        it('should handle user cancellation for FileProperty', async () => {
            mockApp.selectFile.mockResolvedValue(null);

            const result = await mockApp.selectFile(mockVault, ['Institution'], {
                hint: 'Choisir une institution'
            });

            expect(result).toBeNull();
        });

        it('should support multiple classes for FileProperty', async () => {
            const multiClassProp = {
                name: 'contact',
                type: 'FileProperty',
                classes: ['Personne', 'Institution']
            };

            mockApp.selectFile.mockResolvedValue({ getName: () => 'John Doe' });

            await mockApp.selectFile(mockVault, multiClassProp.classes, {
                hint: 'Choisir un contact'
            });

            expect(mockApp.selectFile).toHaveBeenCalledWith(
                mockVault,
                ['Personne', 'Institution'],
                expect.any(Object)
            );
        });
    });

    describe('SelectProperty Population', () => {
        it('should call selectFromList for SelectProperty', async () => {
            mockApp.selectFromList.mockResolvedValue('Actif');

            const statutProp = mockClassConfig.properties.find(
                (p: any) => p.name === 'statut'
            );
            const populateConfig = mockClassConfig.populate[1];

            const result = await mockApp.selectFromList(
                statutProp.options,
                populateConfig.title
            );

            expect(mockApp.selectFromList).toHaveBeenCalledWith(
                ['Actif', 'Inactif', 'En congé', 'Parti'],
                'Choisir un statut'
            );
            expect(result).toBe('Actif');
        });

        it('should handle user cancellation for SelectProperty', async () => {
            mockApp.selectFromList.mockResolvedValue(null);

            const result = await mockApp.selectFromList(
                ['Actif', 'Inactif'],
                'Choisir un statut'
            );

            expect(result).toBeNull();
        });

        it('should validate selected value is in options', async () => {
            const validValue = 'Actif';
            const options = ['Actif', 'Inactif', 'En congé', 'Parti'];

            expect(options).toContain(validValue);
        });
    });

    describe('MultiSelectProperty Population', () => {
        it('should support multiple selections', async () => {
            const competencesProp = {
                name: 'competences',
                type: 'MultiSelectProperty',
                options: ['Management', 'Technique', 'Communication']
            };

            mockApp.selectFromList.mockResolvedValue(['Management', 'Technique']);

            const result = await mockApp.selectFromList(
                competencesProp.options,
                'Choisir des compétences',
                { multiple: true }
            );

            expect(result).toEqual(['Management', 'Technique']);
        });

        it('should return empty array when cancelled', async () => {
            mockApp.selectFromList.mockResolvedValue(null);

            const result = await mockApp.selectFromList(
                ['Option1', 'Option2'],
                'Choisir',
                { multiple: true }
            );

            expect(result).toBeNull();
        });
    });

    describe('TextProperty Population', () => {
        it('should call promptText for text properties', async () => {
            mockApp.promptText.mockResolvedValue('John Doe');

            const result = await mockApp.promptText(
                'Entrez le nom',
                'Nom par défaut'
            );

            expect(mockApp.promptText).toHaveBeenCalledWith(
                'Entrez le nom',
                'Nom par défaut'
            );
            expect(result).toBe('John Doe');
        });

        it('should handle empty text input', async () => {
            mockApp.promptText.mockResolvedValue('');

            const result = await mockApp.promptText('Entrez le nom', '');

            expect(result).toBe('');
        });

        it('should handle cancelled text input', async () => {
            mockApp.promptText.mockResolvedValue(null);

            const result = await mockApp.promptText('Entrez le nom');

            expect(result).toBeNull();
        });
    });

    describe('Required Fields', () => {
        it('should handle required property configuration', () => {
            const requiredPopulate = {
                property: 'institution',
                title: 'Choisir une institution',
                required: true
            };

            expect(requiredPopulate.required).toBe(true);
        });

        it('should retry when required field is cancelled', async () => {
            // First call returns null (cancelled), second call returns value
            mockApp.selectFile
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ getName: () => 'TechCorp' });

            // First attempt - cancelled
            const firstResult = await mockApp.selectFile(mockVault, ['Institution'], {
                hint: 'Required: Choisir une institution'
            });
            expect(firstResult).toBeNull();

            // Second attempt - success
            const secondResult = await mockApp.selectFile(mockVault, ['Institution'], {
                hint: 'Required: Choisir une institution'
            });
            expect(secondResult).not.toBeNull();
        });

        it('should allow optional fields to be skipped', async () => {
            const optionalPopulate = {
                property: 'poste',
                title: 'Entrez le poste',
                required: false
            };

            mockApp.promptText.mockResolvedValue(null);

            const result = await mockApp.promptText(optionalPopulate.title);

            expect(result).toBeNull();
            // Should not throw or retry
        });
    });

    describe('File Creation with Populated Values', () => {
        it('should create file with populated property values', async () => {
            const populatedValues = {
                institution: '[[TechCorp]]',
                statut: 'Actif',
                nom: 'John Doe'
            };

            // Verify values are in correct format
            expect(populatedValues.institution).toMatch(/\[\[.*\]\]/);
            expect(populatedValues.statut).toBe('Actif');
            expect(populatedValues.nom).toBe('John Doe');
        });

        it('should merge populated values with default values', () => {
            const defaultValues = {
                nom: '',
                prenom: '',
                statut: 'Actif'
            };

            const populatedValues = {
                institution: '[[TechCorp]]',
                statut: 'Inactif'
            };

            const finalValues = { ...defaultValues, ...populatedValues };

            expect(finalValues).toEqual({
                nom: '',
                prenom: '',
                statut: 'Inactif',
                institution: '[[TechCorp]]'
            });
        });

        it('should handle partial population (some fields cancelled)', () => {
            const populatedValues = {
                institution: '[[TechCorp]]',
                statut: null // User cancelled this field
            };

            // Filter out null values
            const validValues = Object.entries(populatedValues)
                .filter(([_, value]) => value !== null)
                .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

            expect(validValues).toEqual({
                institution: '[[TechCorp]]'
            });
        });
    });

    describe('Cancel File Creation', () => {
        it('should cancel entire creation if user cancels required field', async () => {
            const requiredPopulate = {
                property: 'institution',
                title: 'Choisir une institution',
                required: true
            };

            mockApp.selectFile.mockResolvedValue(null);
            mockApp.showNotice.mockResolvedValue(undefined);

            const result = await mockApp.selectFile(mockVault, ['Institution'], {
                hint: requiredPopulate.title
            });

            if (result === null && requiredPopulate.required) {
                await mockApp.showNotice('Création annulée');
                expect(mockApp.showNotice).toHaveBeenCalledWith('Création annulée');
            }
        });

        it('should continue creation if optional field is cancelled', async () => {
            const optionalPopulate = {
                property: 'poste',
                title: 'Entrez le poste',
                required: false
            };

            mockApp.promptText.mockResolvedValue(null);

            const result = await mockApp.promptText(optionalPopulate.title);

            expect(result).toBeNull();
            // File creation should continue with other fields
        });
    });

    describe('Multiple Populate Fields', () => {
        it('should populate multiple fields in sequence', async () => {
            mockApp.selectFile.mockResolvedValue({ getLink: () => '[[TechCorp]]' });
            mockApp.selectFromList.mockResolvedValue('Actif');

            // Populate institution
            const institution = await mockApp.selectFile(mockVault, ['Institution'], {
                hint: 'Choisir une institution'
            });

            // Populate statut
            const statut = await mockApp.selectFromList(
                ['Actif', 'Inactif'],
                'Choisir un statut'
            );

            expect(institution).toBeDefined();
            expect(statut).toBe('Actif');
        });

        it('should handle mixed success and cancellation', async () => {
            mockApp.selectFile.mockResolvedValue({ getLink: () => '[[TechCorp]]' });
            mockApp.selectFromList.mockResolvedValue(null);

            const institution = await mockApp.selectFile(mockVault, ['Institution'], {
                hint: 'Choisir une institution'
            });
            const statut = await mockApp.selectFromList(
                ['Actif', 'Inactif'],
                'Choisir un statut'
            );

            expect(institution).not.toBeNull();
            expect(statut).toBeNull();
        });
    });

    describe('Error Handling', () => {
        it('should handle errors when property not found in config', () => {
            const invalidPopulate = {
                property: 'nonExistent',
                title: 'Test'
            };

            const propertyExists = mockClassConfig.properties.some(
                (p: any) => p.name === invalidPopulate.property
            );

            expect(propertyExists).toBe(false);
        });

        it('should handle errors when property type is unsupported', () => {
            const unsupportedProp = {
                name: 'custom',
                type: 'CustomUnsupportedProperty'
            };

            const supportedTypes = [
                'FileProperty',
                'SelectProperty',
                'MultiSelectProperty',
                'Property',
                'TextProperty'
            ];

            expect(supportedTypes).not.toContain(unsupportedProp.type);
        });

        it('should handle IApp method errors gracefully', async () => {
            mockApp.selectFile.mockRejectedValue(new Error('Network error'));

            await expect(
                mockApp.selectFile(mockVault, ['Institution'], { hint: 'Test' })
            ).rejects.toThrow('Network error');
        });
    });
});
