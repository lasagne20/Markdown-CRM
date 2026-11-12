/**
 * Insensibilité à la casse et aux accents du "contains" sur les chaînes.
 *
 * Le contains'était une inclusion stricte (String.includes) : "college" ne
 * matchait pas "Collée Jean Moulin", ni "ehpad" "EHPAD Les Tilleuls". La
 * comparaison se fait désormais sur une forme normalisée (minuscules +
 * suppression des diacritiques), des deux côtés.
 *
 * L'astuce des tableaux (JSON contient "\"Valeur\"") reste un match
 * d'élément exact : la normalisation s'applique aux deux côtés du includes,
 * les guillemets délimiteurs sont conservés.
 *
 * Les comparaisons "current" (liens vers le fichier courant) ne sont PAS
 * normalisées : elles matchent un fichier précis, pas un mot-clé.
 */

import { ConditionManager, ContainsCondition } from '../../src/Config/ConditionManager';
import { Classe } from '../../src/vault/Classe';

describe('ConditionManager - contains insensible à la casse et aux accents', () => {
    let conditionManager: ConditionManager;
    let mockApp: any;
    let instance: Classe;

    beforeEach(() => {
        mockApp = {
            getVaultPath: jest.fn().mockReturnValue('/vault'),
            getName: jest.fn().mockReturnValue('TestVault'),
            listFiles: jest.fn().mockResolvedValue([])
        };
        conditionManager = new ConditionManager({ app: mockApp } as any);
        instance = new Classe(mockApp as any);
    });

    const contains = (property: string, value: any) => ({ property, type: 'contains', value }) as ContainsCondition;

    const mockNameProperty = (link: string) => {
        const nameProp = {
            type: 'name',
            name: 'name',
            read: jest.fn().mockResolvedValue(link)
        };
        jest.spyOn(instance, 'getProperty').mockImplementation((propName: string) =>
            propName === 'name' ? nameProp as any : undefined
        );
    };

    describe('chaîne simple', () => {
        it.each([
            ['[[Collège Jean Moulin]]', 'college', true],
            ['[[Collège Jean Moulin]]', 'COLLEGE', true],
            ['[[Collège Jean Moulin]]', 'collège', true],
            ['[[École élémentaire du Village]]', 'ecole', true],
            ['[[EHPAD Les Tilleuls]]', 'ehpad', true],
            ['[[Lycée du Parc]]', 'lycee', true],
            ['[[ÉCOLE DU VILLAGE]]', 'école', true],
            ['[[Musée de Grenoble]]', 'musee', true],
            ['[[Entreprise Bodin]]', 'college', false],
            ['[[Centre de Loisirs Aventure]]', 'loisirs', true]
        ])('%s contains %s -> %s', async (name, keyword, expected) => {
            mockNameProperty(name);
            const result = await conditionManager.evaluateCondition(contains('name', keyword), instance);
            expect(result).toBe(expected);
        });

        it('notContains aussi normalisé', async () => {
            mockNameProperty('[[Collège Jean Moulin]]');
            const condition = { property: 'name', type: 'notContains', value: 'college' } as any;
            const result = await conditionManager.evaluateCondition(condition, instance);
            expect(result).toBe(false);
        });
    });

    describe('tableaux (astuce JSON à guillemets)', () => {
        const mockPostesProperty = (types: any[]) => {
            const postesProp = {
                type: 'object',
                name: 'postes',
                read: jest.fn().mockResolvedValue(types.map((t) => ({ type: t })))
            };
            jest.spyOn(instance, 'getProperty').mockImplementation((propName: string) =>
                propName === 'postes' ? postesProp as any : undefined
            );
        };

        it.each([
            [['Ecole'], '"ecole"', true],
            [['École'], '"ecole"', true],
            [['Collège'], '"COLLEGE"', true],
            [['Université'], '"ecole"', false],
            [['Réalisé', 'Facturé', 'Payé'], '"paye"', true]
        ])('types %s contains %s -> %s', async (types, keyword, expected) => {
            mockPostesProperty(types);
            const result = await conditionManager.evaluateCondition(contains('postes.type', keyword), instance);
            expect(result).toBe(expected);
        });

        it('garde le match par élément : une valeur suffixée ne matche pas', async () => {
            mockPostesProperty(['Entreprises']);
            const result = await conditionManager.evaluateCondition(contains('postes.type', '"entreprise"'), instance);
            expect(result).toBe(false);
        });
    });
});
