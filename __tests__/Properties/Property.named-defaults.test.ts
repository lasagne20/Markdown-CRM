/**
 * @jest-environment jsdom
 *
 * Valeurs par défaut nommées depuis les réglages du vault (dictionnaire) :
 *
 * Le motif existe deja pour "personalName" (Property.getDefaultValue) avec
 * un TODO dans le code : "use a dictionary for special default values in
 * vault". On l'etend :
 *   - default: "defaultCommercial" -> "[[<nom du commercial par défaut>]]"
 *   - default: "defaultAnimateur"  -> "[[<nom de l'animateur par défaut>]]"
 * (wikilink automatique : ce sont des FileProperty)
 *
 * Deux points d'application :
 *   1. Property.getDefaultValue() - bouton + d'un ObjectProperty (ex: ajouter
 *      une animation pre-remplit son animateur)
 *   2. PopulateManager.mergeWithDefaults - creation d'un fichier (ex: une
 *      nouvelle Action pre-remplit son commercial)
 */

import { FileProperty } from '../../src/properties/FileProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { PopulateManager } from '../../src/Config/PopulateManager';
import { Vault } from '../../src/vault/Vault';

describe('Valeurs par défaut nommées (defaultCommercial / defaultAnimateur)', () => {
    let vault: any;

    beforeEach(() => {
        vault = {
            settings: {
                templateFolder: './templates',
                personalName: 'Léo',
                configPath: './config',
                defaultCommercial: 'Aymeric De Valon',
                defaultAnimateur: 'Christian Masnada'
            },
            getPersonalName: () => vault.settings.personalName,
            readLinkFile: (link: string) => link.replace(/\[\[|\]\]/g, ''),
            app: {
                setIcon: jest.fn(),
                getUrl: jest.fn(async (path: string) => path),
                getFile: jest.fn(async () => null)
            }
        } as any;
    });

    describe('Property.getDefaultValue (bouton + dun ObjectProperty)', () => {
        test('PLANTE : default "defaultCommercial" -> wikilink du commercial par défaut', () => {
            const prop = new FileProperty('commercial', vault, ['Commercial'], { defaultValue: 'defaultCommercial' });
            expect(prop.getDefaultValue()).toBe('[[Aymeric De Valon]]');
        });

        test('PLANTE : default "defaultAnimateur" -> wikilink de l\'animateur par défaut', () => {
            const prop = new FileProperty('animateur', vault, ['Animateur'], { defaultValue: 'defaultAnimateur' });
            expect(prop.getDefaultValue()).toBe('[[Christian Masnada]]');
        });

        test('réglage absent -> valeur vide (pas le nom du réglage en littéral)', () => {
            vault.settings.defaultCommercial = undefined;
            const prop = new FileProperty('commercial', vault, ['Commercial'], { defaultValue: 'defaultCommercial' });
            expect(prop.getDefaultValue()).toBe('');
        });

        test('régression : "personalName" renvoie toujours le nom brut', () => {
            const prop = new TextProperty('auteur', vault, { defaultValue: 'personalName' });
            expect(prop.getDefaultValue()).toBe('Léo');
        });

        test('valeur littérale inchangée', () => {
            const prop = new TextProperty('description', vault, { defaultValue: 'Piste' });
            expect(prop.getDefaultValue()).toBe('Piste');
        });

        test("PLANTE : ajouter une ligne animateurs pré-remplit l'animateur par défaut (sans sélecteur)", async () => {
            // animateur est la PREMIERE propriété d'un ObjectProperty de
            // FileProperty : le + ouvrait toujours le sélecteur de fichier.
            // Avec un défaut configuré, la ligne est pré-remplie directement.
            // (le vault mock n'a ni selectFile ni getExtendedClasses : si le
            // sélecteur s'ouvrait, le test planterait)
            const animateurProp = new FileProperty('animateur', vault, ['Animateur'], { defaultValue: 'defaultAnimateur' });
            const animateurs = new ObjectProperty('animateurs', vault, { animateur: animateurProp });
            // Isoler le comportement : pas de re-rendu du widget (mocks DOM)
            animateurs.reloadObjects = jest.fn();

            const update = jest.fn().mockImplementation(async (v: any) => v);
            const container = document.createElement('div');

            await animateurs.addProperty([], update, container);

            expect(update).toHaveBeenCalled();
            const written = update.mock.calls[0][0];
            expect(written[0].animateur).toBe('[[Christian Masnada]]');
        });
    });

    describe('PopulateManager.mergeWithDefaults (création de fichier)', () => {
        test('PLANTE : defaultValue "defaultCommercial" -> wikilink dans les valeurs du fichier', async () => {
            const manager = new PopulateManager(vault);
            const classConfig = {
                properties: {
                    commercial: { type: 'FileProperty', defaultValue: 'defaultCommercial' },
                    montant: { type: 'NumberProperty', defaultValue: '0' }
                }
            } as any;

            const values = await manager.mergeWithDefaults(classConfig, {});

            expect(values.commercial).toBe('[[Aymeric De Valon]]');
            // Les valeurs littérales ne bougent pas
            expect(values.montant).toBe('0');
        });

        test('PLANTE : defaultValue "defaultAnimateur" -> wikilink', async () => {
            const manager = new PopulateManager(vault);
            const classConfig = {
                properties: {
                    animateur: { type: 'FileProperty', defaultValue: 'defaultAnimateur' }
                }
            } as any;

            const values = await manager.mergeWithDefaults(classConfig, {});
            expect(values.animateur).toBe('[[Christian Masnada]]');
        });
    });
});
