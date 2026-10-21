/**
 * @jest-environment jsdom
 *
 * Option B : re-rendu CIBLÉ des propriétés calculées quand une source change.
 *
 * Scénario (celui du bug "date pas mise à jour") :
 * 1. Rendre une page Action : date (RangeDateProperty derivedFrom animations.date),
 *    montant (FormulaProperty dépendant de financeurs), etat (SelectProperty simple)
 * 2. Vérifier l'affichage initial
 * 3. updatePropertyValue('animations', nouvelles dates)
 * 4. Le widget date doit afficher le NOUVEAU range (re-rendu)
 * 5. Le widget etat ne doit PAS être re-rendu (même nœud DOM, toujours connecté)
 * 6. updatePropertyValue('financeurs', ...) -> le widget montant se met à jour
 *
 * Le test prouve que c'est un re-rendu ciblé (pas un refresh complet déguisé) :
 * l'ancien nœud etat reste connecté au DOM, l'ancien nœud date est remplacé.
 */

import { DisplayRenderer } from '../../src/display/DisplayRenderer';
import { RangeDateProperty } from '../../src/properties/RangeDateProperty';
import { FormulaProperty } from '../../src/properties/FormulaProperty';
import { SelectProperty } from '../../src/properties/SelectProperty';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { DateProperty } from '../../src/properties/DateProperty';
import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('Re-rendu ciblé des propriétés calculées (option B)', () => {
    let vault: Vault;
    let classe: Classe;
    let metadataStore: Record<string, any>;
    const filePath = 'Test Action.md';

    beforeEach(() => {
        metadataStore = {
            [filePath]: {
                classe: 'Action',
                animations: [{ date: '2026-03-26' }],
                financeurs: [{ montant: '100' }],
                partenariats: [],
                etat: 'Piste'
            }
        };

        const app = {
            ...mockApp(),
            getMetadata: jest.fn((ifile: any) => Promise.resolve(metadataStore[ifile.path] ?? {})),
            updateMetadata: jest.fn((ifile: any, data: any) => {
                metadataStore[ifile.path] = data;
                return Promise.resolve();
            })
        } as any;

        vault = new Vault(app, { vaultPath: './test-vault', configPath: './config' } as any);

        const iFile = {
            path: filePath,
            name: 'Test Action.md',
            basename: 'Test Action',
            extension: 'md',
            parent: { path: '' }
        } as any;

        classe = new Classe(vault, iFile);
        (classe as any).name = 'Action';

        classe.addProperty(new RangeDateProperty('date', vault, { derivedFrom: 'animations.date' }));
        classe.addProperty(new FormulaProperty('montant', vault,
            "return (financeurs ? financeurs.length : 0) + (partenariats ? partenariats.length : 0)"
        ));
        classe.addProperty(new SelectProperty('etat', vault, [
            { name: 'Piste', color: 'gray' },
            { name: 'Payé', color: 'gold' }
        ]));
        classe.addProperty(new ObjectProperty('animations', vault, {
            date: new DateProperty('date', vault, [])
        }));
        // financeurs/partenariats sont des propriétés réelles d'Action :
        // l'extraction de dépendances ne détecte que les noms connus de la classe
        classe.addProperty(new ObjectProperty('financeurs', vault, {}));
        classe.addProperty(new ObjectProperty('partenariats', vault, {}));

        // Les process onCreate/onUpdate des classes réelles sont sans objet ici
        (classe as any).onCreate = async () => {};
        (classe as any).onUpdate = async () => {};
    });

    // DisplayRenderer attend (vault, propertiesRecord, context)
    const properties = () => classe.getAllProperties();

    const displayItems = [
        { type: 'property', name: 'date' },
        { type: 'property', name: 'montant' },
        { type: 'property', name: 'etat' }
    ];

    test('PLANTE : changer la date d\'une animation met à jour le widget date affiché', async () => {
        const renderer = new DisplayRenderer(vault as any, properties() as any, classe as any);
        const container = document.createElement('div');
        document.body.appendChild(container);

        await renderer.renderDisplayItems(container, displayItems as any);

        // Affichage initial : date dérivée de l'animation du 26 mars
        expect(container.textContent).toContain('26 mars 2026');

        // Référence aux widgets rendus (pour prouver le re-rendu ciblé)
        const dateWidget = Array.from(container.querySelectorAll('.metadata-field'))
            .find(el => el.textContent?.includes('26 mars 2026')) as HTMLElement;
        const etatWidget = Array.from(container.querySelectorAll('.metadata-field'))
            .find(el => el.textContent?.includes('Piste')) as HTMLElement;
        expect(dateWidget).toBeDefined();
        expect(etatWidget).toBeDefined();

        // L'utilisateur change la date de l'animation (ou en ajoute une)
        await classe.updatePropertyValue('animations', [
            { date: '2026-11-05' },
            { date: '2026-11-07' }
        ]);

        // Le widget date affiche le NOUVEAU range dérivé
        expect(container.textContent).toContain('5 novembre 2026');
        expect(container.textContent).toContain('7 novembre 2026');

        // Preuve du re-rendu CIBLÉ :
        // - l'ancien widget date a été remplacé (plus connecté au DOM)
        expect(dateWidget.isConnected).toBe(false);
        // - le widget etat est le MÊME nœud, toujours connecté (pas re-rendu)
        expect(etatWidget.isConnected).toBe(true);
        expect(etatWidget.textContent).toContain('Piste');
    });

    test('PLANTE : changer financeurs met à jour le widget montant (formule)', async () => {
        const renderer = new DisplayRenderer(vault as any, properties() as any, classe as any);
        const container = document.createElement('div');
        document.body.appendChild(container);

        await renderer.renderDisplayItems(container, displayItems as any);

        // Montant initial : financeurs.length = 1
        expect(container.textContent).toContain('1');

        const etatWidget = Array.from(container.querySelectorAll('.metadata-field'))
            .find(el => el.textContent?.includes('Piste')) as HTMLElement;

        await classe.updatePropertyValue('financeurs', [
            { montant: '100' }, { montant: '250' }, { montant: '300' }
        ]);

        // Le montant re-rendu : financeurs.length = 3
        expect(container.textContent).toContain('3');

        // etat toujours intact (pas concerné par financeurs)
        expect(etatWidget.isConnected).toBe(true);
    });

    test('PLANTE : changer une propriété non-source ne re-rend rien', async () => {
        const renderer = new DisplayRenderer(vault as any, properties() as any, classe as any);
        const container = document.createElement('div');
        document.body.appendChild(container);

        await renderer.renderDisplayItems(container, displayItems as any);

        const dateWidget = Array.from(container.querySelectorAll('.metadata-field'))
            .find(el => el.textContent?.includes('26 mars 2026')) as HTMLElement;

        // etat ne fait partie d'aucune dépendance (ni derivedFrom ni formule)
        await classe.updatePropertyValue('etat', 'Payé');

        // Le widget date est TOUJOURS le même nœud (pas re-rendu)
        expect(dateWidget.isConnected).toBe(true);
        expect(container.textContent).toContain('26 mars 2026');
    });

    test('PLANTE : la notification propertyChanged est émise par updatePropertyValue', async () => {
        const received: string[] = [];
        (classe as any).onPropertyChanged = (propName: string) => received.push(propName);

        await classe.updatePropertyValue('animations', [{ date: '2026-11-05' }]);
        await classe.updatePropertyValue('etat', 'Payé');

        expect(received).toEqual(['animations', 'etat']);
    });

    test('sans listener, updatePropertyValue ne casse rien', async () => {
        // Pas de onPropertyChanged défini : comportement inchangé
        await classe.updatePropertyValue('etat', 'Payé');
        expect(metadataStore[filePath].etat).toBe('Payé');
    });
});
