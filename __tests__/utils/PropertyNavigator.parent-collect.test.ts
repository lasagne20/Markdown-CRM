/**
 * @jest-environment jsdom
 *
 * Tests reproduisant le bug "Nombre de communes desservies" :
 * la syntaxe `financeurs.financeur.parent,clients.client.parent` avec
 * formula countDistinct ne renvoie pas le bon chiffre.
 *
 * BUG 1 : le keyword `parent` n'est pas résolu après un lien [[...]] -
 *         le bloc string-link redirige vers getNestedProperty qui lit
 *         metadata['parent'] (inexistant) au lieu d'appeler getParent().
 * BUG 2 : la navigation standard renvoie undefined pour les arrays
 *         multi-éléments (by design, filter() syntax) - il faut un mode
 *         "collect" qui rassemble TOUTES les valeurs à plat.
 */

import { PropertyNavigator } from '../../src/utils/PropertyNavigator';

describe('PropertyNavigator - parent keyword et mode collect (bug communes)', () => {
    let vault: any;
    let navigator: PropertyNavigator;

    // Classe mock : Institution -> parent Commune
    const makeClasse = (name: string, parentName: string | null) => ({
        getName: () => name,
        getParent: parentName
            ? async () => ({ getName: () => parentName })
            : async () => undefined,
        getPropertyValue: async () => undefined
    });

    beforeEach(() => {
        vault = {
            getFromLink: jest.fn(async (link: string) => {
                const inner = link.replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0].trim();
                switch (inner) {
                    case 'InstA': return makeClasse('InstA', 'CommuneX');
                    case 'InstB': return makeClasse('InstB', 'CommuneY');
                    case 'InstC': return makeClasse('InstC', 'CommuneX');
                    case 'InstD': return makeClasse('InstD', 'CommuneZ');
                    case 'ClientB': return makeClasse('ClientB', 'CommuneY');
                    default: return undefined;
                }
            })
        } as any;
        navigator = new PropertyNavigator(vault);
    });

    const makeObj = (metadata: any) => ({
        getPropertyValue: async (propName: string) => metadata[propName]
    });

    describe('BUG 1 : keyword parent apres un lien', () => {
        test('PLANTE : financeurs.financeur.parent doit resoudre le parent de l\'institution liee', async () => {
            const action = makeObj({
                financeurs: [{ financeur: '[[InstA]]', montant: 100 }]
            });

            const result = await navigator.getNestedProperty(action, 'financeurs.financeur.parent');
            // Le parent de InstA est CommuneX -> [[CommuneX]]
            expect(result).toBe('[[CommuneX]]');
        });

        test('PLANTE : parent avec navigation ulterieure (parent.nom)', async () => {
            const action = makeObj({
                financeurs: [{ financeur: '[[InstA]]' }]
            });

            // Le parent CommuneX a une propriete nom
            vault.getFromLink.mockImplementation(async (link: string) => {
                const inner = link.replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0].trim();
                if (inner === 'InstA') return makeClasse('InstA', 'CommuneX');
                if (inner === 'CommuneX') return {
                    getName: () => 'CommuneX',
                    getParent: async () => undefined,
                    getPropertyValue: async (p: string) => p === 'nom' ? 'Commune X' : undefined
                };
                return undefined;
            });

            const result = await navigator.getNestedProperty(action, 'financeurs.financeur.parent.nom');
            expect(result).toBe('Commune X');
        });
    });

    describe('Comportement standard conserve (multi-elements)', () => {
        test('la navigation standard garde undefined pour les arrays multi-elements (mode filter)', async () => {
            const action = makeObj({
                financeurs: [{ financeur: '[[InstA]]' }, { financeur: '[[InstB]]' }]
            });

            const result = await navigator.getNestedProperty(action, 'financeurs.financeur.parent');
            // Comportement documente : le mode standard ne deballe pas les arrays
            // multi-elements - c'est le mode collect qui les rassemble.
            expect(result).toBeUndefined();
        });
    });

    describe('BUG 2 : mode collect (nouveau)', () => {
        test('PLANTE : collectNestedProperty doit rassembler TOUS les parents (flat)', async () => {
            const action = makeObj({
                financeurs: [{ financeur: '[[InstA]]' }, { financeur: '[[InstB]]' }]
            });

            const result = await navigator.collectNestedProperty(action, 'financeurs.financeur.parent');
            expect(result).toEqual(['[[CommuneX]]', '[[CommuneY]]']);
        });

        test('PLANTE : collectNestedProperty avec un seul element retourne quand meme un array', async () => {
            const action = makeObj({
                financeurs: [{ financeur: '[[InstA]]' }]
            });

            const result = await navigator.collectNestedProperty(action, 'financeurs.financeur.parent');
            expect(result).toEqual(['[[CommuneX]]']);
        });

        test('PLANTE : collectNestedProperty sur clients aussi', async () => {
            const action = makeObj({
                clients: [{ client: '[[ClientB]]' }, { client: '[[InstD]]' }]
            });

            const result = await navigator.collectNestedProperty(action, 'clients.client.parent');
            expect(result.sort()).toEqual(['[[CommuneY]]', '[[CommuneZ]]'].sort());
        });

        test('collect retourne un array vide pour des donnees vides', async () => {
            const action = makeObj({ financeurs: [] });

            const result = await navigator.collectNestedProperty(action, 'financeurs.financeur.parent');
            expect(result).toEqual([]);
        });

        test('collect ignore les institutions sans parent', async () => {
            const action = makeObj({
                financeurs: [{ financeur: '[[InstA]]' }, { financeur: '[[SansParent]]' }]
            });

            const result = await navigator.collectNestedProperty(action, 'financeurs.financeur.parent');
            expect(result).toEqual(['[[CommuneX]]']);
        });

        test('collect sur un path simple retourne la valeur en array', async () => {
            const action = makeObj({ montant: 150 });

            const result = await navigator.collectNestedProperty(action, 'montant');
            expect(result).toEqual([150]);
        });
    });
});
