/**
 * Test de reproduction du bug utilisateur : le filtre d'un tableau sur un fichier complexe
 * avec un référencement par un autre élément pose problème.
 * 
 * Bug original : institution avec chemin complexe et poste vide n'était pas trouvée
 * 
 * FIX: Ce test valide que la correspondance d'institution fonctionne ET 
 * que les chaînes vides sont préservées au lieu d'être filtrées.
 */

import { DynamicTable } from '../../src/display/DynamicTable';

// Mock vault simple
const mockVault = {
    getAbstractFileByPath: jest.fn(),
    getMarkdownFiles: jest.fn(() => [])
} as any;

describe('DynamicTable Path Mismatch Bug - FIXED ✅', () => {
    it('should correctly match institution with complex path and preserve empty poste value', async () => {
        console.log('🎯 TESTING FIX: User bug should now be resolved...');

        // === Institution file avec chemin complexe ===
        const currentInstitutionFile = {
            path: 'France/PDL/44 - Loire-Atlantique/Nantes Métropole/44000 - Nantes/Instits/jghgjhgjgjghj.md',
            basename: 'jghgjhgjgjghj.md',

            getFile() {
                console.log('🔧 Institution getFile() called');
                return {
                    name: 'jghgjhgjgjghj.md',
                    basename: 'jghgjhgjgjghj',
                    getName: (withExtension: boolean = true) => {
                        const result = withExtension ? 'jghgjhgjgjghj.md' : 'jghgjhgjgjghj';
                        console.log(`🔧 Institution getName(${withExtension}) = "${result}"`);
                        return result;
                    }
                };
            },

            getProperty: jest.fn(() => null),
            getPropertyValue: function(property: string) {
                console.log('🔧 Institution getPropertyValue called');
                return null; // Institution doesn't have postes property
            }
        } as any;

        // === Person file with poste containing empty string ===
        const personFile = {
            path: 'Personnes/SomePersonName.md',
            basename: 'SomePersonName.md',

            getFile() {
                return {
                    name: 'SomePersonName.md',
                    basename: 'SomePersonName',
                    getName: (withExtension: boolean = true) => {
                        return withExtension ? 'SomePersonName.md' : 'SomePersonName';
                    }
                };
            },

            getProperty: jest.fn(() => null),
            getPropertyValue: function(property: string) {
                console.log(`🔧 Person getPropertyValue("${property}")`);
                if (property === 'postes') {
                    const result = [
                        {
                            institution: "[[France/PDL/44 - Loire-Atlantique/Nantes Métropole/44000 - Nantes/Instits/jghgjhgjgjghj.md|jghgjhgjgjghj]]",
                            poste: "" // 🎯 Empty string - should be preserved, not filtered!
                        }
                    ];
                    console.log('🔧 Person postes:', JSON.stringify(result));
                    return result;
                }
                return undefined;
            }
        } as any;

        console.log(`📁 Current institution file path: "${currentInstitutionFile.path}"`);
        console.log(`📄 Person file path: "${personFile.path}"`);

        const dynamicTable = new DynamicTable(
            [personFile], // The table shows people
            {
                columns: [
                    {
                        name: 'Postes',
                        propertyName: 'postes.filter(institution=$current).poste'
                    }
                ]
            },
            mockVault,
            currentInstitutionFile  // Current file is the institution
        );

        // Mock getFiles to return the institution file
        (dynamicTable as any).getFiles = () => [currentInstitutionFile];

        console.log('🔍 Attempting to get postes for current institution...');

        const result = await (dynamicTable as any).getNestedPropertyValue(
            personFile, 
            'postes.filter(institution=$current).poste'
        );
        
        console.log('🎯 RESULT:', result);

        // 🎯 BUG WAS: This used to return undefined because empty strings were filtered out
        // 🎯 FIX IS: Now should return "" because empty strings are preserved
        expect(result).toBe('');
        console.log('✅ Bug fixed: Institution matched and empty string preserved');
    });

    it('should work with non-empty poste values too', async () => {
        console.log('🧪 TESTING WITH NON-EMPTY POSTE...');

        const currentInstitutionFile = {
            path: 'France/PDL/44 - Loire-Atlantique/Nantes Métropole/44000 - Nantes/Instits/jghgjhgjgjghj.md',
            basename: 'jghgjhgjgjghj.md',
            getFile() {
                return {
                    name: 'jghgjhgjgjghj.md', basename: 'jghgjhgjgjghj',
                    getName: (withExtension: boolean = true) => withExtension ? 'jghgjhgjgjghj.md' : 'jghgjhgjgjghj'
                };
            },
            getProperty: jest.fn(() => null),
            getPropertyValue: () => null
        } as any;

        const personFile = {
            path: 'Personnes/DirectorPersonName.md', basename: 'DirectorPersonName.md',
            getFile() {
                return { name: 'DirectorPersonName.md', basename: 'DirectorPersonName',
                    getName: (withExtension: boolean = true) => withExtension ? 'DirectorPersonName.md' : 'DirectorPersonName'
                };
            },
            getProperty: jest.fn(() => null),
            getPropertyValue: function(property: string) {
                if (property === 'postes') {
                    return [
                        {
                            institution: "[[France/PDL/44 - Loire-Atlantique/Nantes Métropole/44000 - Nantes/Instits/jghgjhgjgjghj.md|jghgjhgjgjghj]]",
                            poste: "Directeur" // Non-empty string
                        }
                    ];
                }
                return undefined;
            }
        } as any;

        const dynamicTable = new DynamicTable(
            [personFile],
            {
                columns: [
                    {
                        name: 'Postes',
                        propertyName: 'postes.filter(institution=$current).poste'
                    }
                ]
            },
            mockVault,
            currentInstitutionFile
        );

        (dynamicTable as any).getFiles = () => [currentInstitutionFile];

        const result = await (dynamicTable as any).getNestedPropertyValue(
            personFile, 
            'postes.filter(institution=$current).poste'
        );
        
        console.log('✅ Non-empty poste result:', result);
        expect(result).toBe('Directeur');
        console.log('✅ Success: Institution matched and non-empty poste returned');
    });
});