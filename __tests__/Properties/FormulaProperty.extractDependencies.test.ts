/**
 * Extraction automatique des dépendances d'une FormulaProperty.
 *
 * La formule reçoit les propriétés de la classe comme identifiants JS
 * (noms sanitifiés : espaces supprimés). Les dépendances = les noms de
 * propriétés présents dans le code de la formule (lookarounds pour éviter
 * les sous-chaînes et gérer les accents, que \b ne traite pas).
 *
 * Faux positifs acceptés (nom dans une string de la formule) : re-render
 * superflu sans conséquence. Faux négatifs théoriques (nom construit
 * dynamiquement) : quasi inexistants en pratique.
 */

import { FormulaProperty } from '../../src/properties/FormulaProperty';

describe('FormulaProperty.extractDependencies', () => {
    const actionPropertyNames = [
        'id', 'commercial', 'tarifCommercial', 'prospection', 'clients',
        'financeurs', 'partenariats', 'date', 'event', 'etat', 'montant',
        'participants', 'presse', 'adress', 'animations'
    ];

    test('la formule montant détecte financeurs et partenariats', () => {
        const formula = "return (financeurs ? financeurs.reduce((sum, f) => sum + Number(f.montant || 0), 0) : 0) + (partenariats ? partenariats.reduce((sum, p) => sum + Number(p.montant || 0), 0) : 0) + ' €'";

        const deps = FormulaProperty.extractDependencies(formula, actionPropertyNames);
        expect(deps).toContain('financeurs');
        expect(deps).toContain('partenariats');
        // Pas de dépendances fantômes
        expect(deps).not.toContain('clients');
        expect(deps).not.toContain('animations');
    });

    test('la formule participants détecte clients', () => {
        const formula = "return (clients ? clients.reduce((sum, f) => sum + Number(f.participants || 0), 0) : 0)";

        const deps = FormulaProperty.extractDependencies(formula, actionPropertyNames);
        expect(deps).toContain('clients');
        // 'participants' (f.participants = sous-propriété d'objet) est un faux
        // positif accepté : re-render superflu sans conséquence. En pratique il
        // est filtré comme auto-référence dans DisplayRenderer (la propriété
        // participants EST cette formule).
        expect(deps).toContain('participants');
    });

    test('PLANTE : un nom de propriété avec espaces est détecté via sa forme sanitifiée', () => {
        const names = ['tarifCommercial', 'Tarif commercial', 'etat'];
        const formula = "return Tarifcommercial * 2";

        const deps = FormulaProperty.extractDependencies(formula, names);
        expect(deps).toContain('Tarif commercial');
    });

    test('un nom en sous-chaîne ne matche pas (partenaire vs partenariats)', () => {
        const formula = "return partenaire.length";
        const deps = FormulaProperty.extractDependencies(formula, ['partenaire', 'partenariats']);
        expect(deps).toEqual(['partenaire']);
    });

    test('un nom dans une string de la formule est un faux positif accepté', () => {
        const formula = "return 'le montant total' + etat";
        const deps = FormulaProperty.extractDependencies(formula, ['montant', 'etat']);
        // 'montant' apparaît dans la string -> faux positif documenté (re-render superflu)
        expect(deps).toContain('etat');
    });

    test('PLANTE : les noms avec accents sont détectés (lookarounds, pas \\b)', () => {
        const formula = "return clé ? 1 : 0";
        const deps = FormulaProperty.extractDependencies(formula, ['clé', 'etat']);
        expect(deps).toContain('clé');
    });

    test('formule sans dépendance -> liste vide', () => {
        const formula = "return 42";
        const deps = FormulaProperty.extractDependencies(formula, actionPropertyNames);
        expect(deps).toEqual([]);
    });

    test('PLANTE : caractères regex dans le nom sont échappés', () => {
        const formula = "return prop.with.dots ? 1 : 0";
        const deps = FormulaProperty.extractDependencies(formula, ['prop.with.dots']);
        expect(deps).toContain('prop.with.dots');
    });
});
