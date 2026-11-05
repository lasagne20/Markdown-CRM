/**
 * @jest-environment jsdom
 */
// Régression : l'item timeline doit rendre via un contexte Classe RÉEL.
// Le contexte réel expose getPropertyValue (pas getValue) — le premier
// déploiement lisait getValue et rendait un conteneur vide (titre seul).
import { Vault } from '../../src/vault/Vault';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { DateProperty } from '../../src/properties/DateProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { SelectProperty } from '../../src/properties/SelectProperty';
import { FileProperty } from '../../src/properties/FileProperty';
import { mockApp } from '../utils/mocks';
import { DisplayRenderer } from '../../src/display/DisplayRenderer';

describe('TimelineDisplay - intégration DisplayRenderer/Classe', () => {
    test("PLANTE : timeline rendue avec un contexte exposant getPropertyValue", async () => {
        const app = mockApp();
        const vault = new Vault(app as any, { vaultPath: './test' } as any);

        const suivie = new ObjectProperty('suivie', vault, {
            date: new DateProperty('date', vault, [], { title: 'Date' } as any),
            type: new SelectProperty('type', vault, [{ name: 'Appel', color: '' }, { name: 'Email', color: '' }], { title: 'Type' } as any),
            interlocuteur: new FileProperty('interlocuteur', vault, { title: 'Interlocuteur', classes: ['Commercial'] } as any),
            description: new TextProperty('description', vault, { title: 'Description' } as any)
        } as any, { display: 'table', appendFirst: true } as any);

        // Contexte façon Classe : getPropertyValue, PAS de getValue
        const context: any = {
            name: 'Institution',
            getPropertyValue: async (prop: string) =>
                prop === 'suivie' ? [{ id: 'x', date: '2026-02-01', type: 'Email' }] : undefined,
            updateValue: async () => undefined,
            getPath: () => 'Institutions/Ecole.md',
            findChildren: async () => []
        };
        (vault as any).getDynamicClassFactory = () => ({ getAllInstancesForClass: async () => [] });
        (vault as any).conditionManager = { createValidationFunction: () => async () => true };

        const renderer = new DisplayRenderer(vault, { suivie }, context);
        const item = {
            type: 'timeline' as const,
            title: 'Suivi des contacts',
            property: 'suivie',
            sort: 'desc' as const,
            actions: { source: { class: 'Action', smartFilter: 'children' }, date: 'date', typeLabel: 'Action' }
        };

        const el = await (renderer as any).renderTimeline(item);
        expect(el.querySelector('table')).not.toBeNull();
        expect(el.querySelector('.metadata-add-button')).not.toBeNull();
        // L'entrée manuelle est rendue (entête + 1 ligne) avec sa date
        expect(el.querySelectorAll('tr')).toHaveLength(2);
        expect(el.textContent).toContain('2026');
    });
});
