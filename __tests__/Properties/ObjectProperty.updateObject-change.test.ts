/**
 * @jest-environment jsdom
 *
 * Détection de changement sur edit via ObjectProperty.updateObject.
 *
 * Bug : Property.read() retourne l'objet VIVANT du cache de métadonnées
 * (même référence à chaque lecture, comme le metadataCache d'Obsidian).
 * Le widget animations capture cet objet en closure ; updateObject mutait
 * values[index][property] = value DIRECTEMENT dessus, puis appelait
 * update(values). updatePropertyValue relisait alors oldValue dans le cache
 * — déjà empoisonné par la mutation — et concluait oldValue === value :
 * "pas de changement" → notification et processus (renames !) silencieusement
 * ignorés, alors que l'écriture se faisait quand même.
 *
 * Fix attendu : updateObject travaille sur une COPIE PROFONDE de values.
 * Le cache n'est jamais muté par le widget, la comparaison old/new dans
 * updatePropertyValue détecte le changement, la notification part et les
 * processus tournent.
 */

import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { DateProperty } from '../../src/properties/DateProperty';
import { mockApp } from '../utils/mocks';

describe('ObjectProperty.updateObject - détection de changement avec cache vivant', () => {
    let vault: Vault;
    let classe: Classe;
    let animationsProperty: ObjectProperty;
    let dateProperty: DateProperty;
    let metadataStore: Record<string, any>;
    const filePath = 'Test Action.md';

    beforeEach(() => {
        metadataStore = {
            [filePath]: {
                classe: 'Action',
                animations: [{ date: '2026-11-19', etat: 'Disponibilité demandée' }]
            }
        };

        // Comme Obsidian : getMetadata retourne TOUJOURS LE MÊME objet (le "cache vivant")
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

        dateProperty = new DateProperty('date', vault, []);
        animationsProperty = new ObjectProperty('animations', vault, { date: dateProperty });
        classe.addProperty(animationsProperty);
    });

    test("PLANTE : l'edit d'une sous-propriété via updateObject déclenche onPropertyChanged", async () => {
        const values = await animationsProperty.read(classe);
        expect(values[0].date).toBe('2026-11-19');

        const notified: string[] = [];
        classe.onPropertyChanged = async (propertyName: string) => {
            notified.push(propertyName);
        };

        const container = document.createElement('div');
        await animationsProperty.updateObject(
            values,
            async (v: any) => classe.updatePropertyValue('animations', v),
            0,
            dateProperty,
            '2026-11-26',
            container as any
        );

        // Le changement DOIT être détecté → notification émise
        expect(notified).toEqual(['animations']);
        // ... et la nouvelle date écrite
        expect(metadataStore[filePath].animations[0].date).toBe('2026-11-26');
    });

    test("PLANTE : updateObject n'empoisonne pas l'objet du cache capturé par le widget", async () => {
        const values = await animationsProperty.read(classe);

        const container = document.createElement('div');
        await animationsProperty.updateObject(
            values,
            async (v: any) => classe.updatePropertyValue('animations', v),
            0,
            dateProperty,
            '2026-11-26',
            container as any
        );

        // L'objet vivant lu AVANT l'edit n'a pas été muté :
        // la valeur d'origine reste l'ancienne date
        expect(values[0].date).toBe('2026-11-19');
    });

    test("l'edit d'une sous-propriété via updateObject déclenche aussi les processus onPropertyChange", async () => {
        const values = await animationsProperty.read(classe);

        const processCalls: string[] = [];
        (vault as any).getProcessManager = () => ({
            runProcesses: jest.fn(async (className: string, instance: any, trigger: string) => {
                processCalls.push(trigger);
            })
        });

        const container = document.createElement('div');
        await animationsProperty.updateObject(
            values,
            async (v: any) => classe.updatePropertyValue('animations', v),
            0,
            dateProperty,
            '2026-11-26',
            container as any
        );

        expect(processCalls).toContain('onPropertyChange');
    });
});
