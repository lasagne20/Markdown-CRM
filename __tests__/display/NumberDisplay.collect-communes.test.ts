/**
 * @jest-environment jsdom
 *
 * Test du calcul "Nombre de communes desservies" dans NumberDisplay :
 *   source: class Action (avec partenariat courant)
 *   formula: countDistinct
 *   propertyName: financeurs.financeur.parent,clients.client.parent
 *
 * Attendu : le nombre de communes DISTINCTES parmi tous les parents de tous
 * les financeurs et de tous les clients de toutes les actions.
 *
 * Bugs reproduits :
 * 1. Le keyword parent n'est pas résolu après un lien [[...]]
 * 2. Les arrays multi-éléments renvoient undefined au lieu de toutes les valeurs
 * 3. -> countDistinct renvoie 0 au lieu du vrai nombre de communes
 */

import { NumberDisplay } from '../../src/display/NumberDisplay';
import { PropertyNavigator } from '../../src/utils/PropertyNavigator';

describe('NumberDisplay - countDistinct des communes desservies (multi-chemins)', () => {
    let vault: any;

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
                    case 'InstC': return makeClasse('InstC', 'CommuneX');  // meme commune que InstA
                    case 'InstD': return makeClasse('InstD', 'CommuneZ');
                    case 'ClientB': return makeClasse('ClientB', 'CommuneY');
                    default: return undefined;
                }
            })
        } as any;
    });

    // Mock d'un fichier Action dont getPropertyValue delegue au vrai PropertyNavigator
    // (comme le fait Classe.getPropertyValue pour les paths complexes)
    const makeActionFile = (metadata: any) => ({
        getVault: () => vault,
        getPropertyValue: async (name: string, ctx?: any) => {
            if (name.includes('.') || name.includes('[')) {
                const nav = new PropertyNavigator(vault, ctx);
                return await nav.getNestedProperty(
                    { getPropertyValue: (p: string) => Promise.resolve(metadata[p]) },
                    name
                );
            }
            return metadata[name];
        }
    });

    test('PLANTE : countDistinct compte toutes les communes distinctes de toutes les actions', async () => {
        const action1 = makeActionFile({
            etat: 'Réalisé',
            financeurs: [{ financeur: '[[InstA]]', montant: 100 }],   // parent CommuneX
            clients: [{ client: '[[ClientB]]' }]                      // parent CommuneY
        });

        const action2 = makeActionFile({
            etat: 'Réalisé',
            // 2 financeurs : CommuneX (doublon avec InstA) + CommuneZ
            financeurs: [{ financeur: '[[InstC]]' }, { financeur: '[[InstD]]' }],
            clients: []
        });

        const value = await (NumberDisplay as any).calculateValue(
            [action1, action2],
            'countDistinct',
            'financeurs.financeur.parent,clients.client.parent',
            undefined,
            undefined
        );

        // Communes distinctes : CommuneX, CommuneY, CommuneZ
        expect(value).toBe(3);
    });

    test('PLANTE : une action avec plusieurs financeurs contribue toutes ses communes', async () => {
        const action = makeActionFile({
            financeurs: [
                { financeur: '[[InstA]]' },  // CommuneX
                { financeur: '[[InstB]]' },  // CommuneY
                { financeur: '[[InstD]]' }   // CommuneZ
            ],
            clients: []
        });

        const value = await (NumberDisplay as any).calculateValue(
            [action],
            'countDistinct',
            'financeurs.financeur.parent',
            undefined,
            undefined
        );

        expect(value).toBe(3);
    });

    test('les communes identiques via financeurs et clients ne sont comptees qu\'une fois', async () => {
        const action = makeActionFile({
            financeurs: [{ financeur: '[[InstA]]' }],   // CommuneX
            clients: [{ client: '[[InstC]]' }]          // CommuneX aussi
        });

        const value = await (NumberDisplay as any).calculateValue(
            [action],
            'countDistinct',
            'financeurs.financeur.parent,clients.client.parent',
            undefined,
            undefined
        );

        expect(value).toBe(1);
    });

    test('count (non distinct) compte toutes les occurrences collectees', async () => {
        const action = makeActionFile({
            financeurs: [{ financeur: '[[InstA]]' }, { financeur: '[[InstC]]' }],  // CommuneX x2
            clients: []
        });

        const value = await (NumberDisplay as any).calculateValue(
            [action],
            'count',
            'financeurs.financeur.parent',
            undefined,
            undefined
        );

        expect(value).toBe(2);
    });

    test('les formules numeriques ne sont pas affectees (sum via path simple)', async () => {
        const action1 = makeActionFile({ financeurs: [{ montant: 100 }] });
        const action2 = makeActionFile({ financeurs: [{ montant: 50 }] });

        const value = await (NumberDisplay as any).calculateValue(
            [action1, action2],
            'sum',
            'financeurs.montant',
            undefined,
            undefined
        );

        expect(value).toBe(150);
    });

    test('PLANTE : sum additionne TOUTES les valeurs des tableaux multi-éléments (clients.nombre)', async () => {
        // "Personnes touchées" d'un lieu : chaque action a plusieurs clients,
        // chacun avec son nombre de participants. La navigation standard
        // ignore les tableaux multi-éléments : il faut le mode collecte.
        const action1 = makeActionFile({ clients: [{ nombre: 56 }, { nombre: 20 }] });
        const action2 = makeActionFile({ clients: [{ nombre: 71 }] });
        const action3 = makeActionFile({}); // action sans clients

        const value = await (NumberDisplay as any).calculateValue(
            [action1, action2, action3],
            'sum',
            'clients.nombre',
            undefined,
            undefined
        );

        expect(value).toBe(147);
    });

    test('PLANTE : sum collecte aussi les montants de plusieurs financeurs par action', async () => {
        // Plusieurs financeurs par action : chaque montant doit compter
        const action1 = makeActionFile({ financeurs: [{ montant: 100 }, { montant: 250 }] });
        const action2 = makeActionFile({ financeurs: [{ montant: 50 }] });

        const value = await (NumberDisplay as any).calculateValue(
            [action1, action2],
            'sum',
            'financeurs.montant',
            undefined,
            undefined
        );

        expect(value).toBe(400);
    });
});
