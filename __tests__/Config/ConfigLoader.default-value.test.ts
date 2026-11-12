/**
 * Transmission du defaultValue du YAML aux propriétés.
 *
 * PopulateManager lit la config YAML brute (defaultValue résolu à la création
 * du fichier), mais ObjectProperty.addProperty passe par
 * Property.getDefaultValue(), qui lit this.default. Si ConfigLoader ne
 * transmet pas config.defaultValue au constructeur, this.default reste "" :
 * le bouton + d'un ObjectProperty (ex: nouvel objet "suivie" d'une Personne)
 * ne pré-remplit pas l'interlocuteur (default: "defaultCommercial").
 */

import { ConfigLoader } from '../../src/Config/ConfigLoader';
import { FileProperty } from '../../src/properties/FileProperty';
import { ObjectProperty } from '../../src/properties/ObjectProperty';

describe('ConfigLoader - transmission du defaultValue aux propriétés', () => {
    let vault: any;
    let configLoader: ConfigLoader;

    beforeEach(() => {
        vault = {
            settings: {
                personalName: 'Léo',
                defaultCommercial: 'Léo Dupont'
            },
            getPersonalName: () => vault.settings.personalName,
            readLinkFile: (link: string) => link.replace(/\[\[|\]\]/g, ''),
            getFromLink: jest.fn().mockResolvedValue(null),
            app: {
                setIcon: jest.fn(),
                getUrl: jest.fn(async (path: string) => path),
                getFile: jest.fn(async () => null)
            }
        } as any;

        configLoader = new ConfigLoader('', vault);
    });

    it('transmet defaultValue à une propriété de premier niveau', () => {
        const property = configLoader.createProperty({
            propertyKey: 'interlocuteur',
            type: 'FileProperty',
            classes: ['Commercial'],
            defaultValue: 'defaultCommercial'
        } as any) as FileProperty;

        expect((property as any).default).toBe('defaultCommercial');
        expect(property.getDefaultValue()).toBe('[[Léo Dupont]]');
    });

    it('transmet la valeur littérale defaultValue', () => {
        const property = configLoader.createProperty({
            propertyKey: 'etat',
            type: 'SelectProperty',
            defaultValue: 'Prospection'
        } as any);

        expect(property.getDefaultValue()).toBe('Prospection');
    });

    it('transmet defaultValue aux sous-propriétés d\'un ObjectProperty (suivie.interlocuteur)', () => {
        const objectProperty = configLoader.createProperty({
            propertyKey: 'suivie',
            type: 'ObjectProperty',
            properties: {
                date: { type: 'DateProperty' },
                interlocuteur: {
                    type: 'FileProperty',
                    classes: ['Commercial'],
                    defaultValue: 'defaultCommercial'
                },
                type: { type: 'SelectProperty' },
                description: { type: 'TextProperty' }
            }
        } as any) as ObjectProperty;

        const interlocuteur = (objectProperty as any).properties['interlocuteur'] as FileProperty;
        expect((interlocuteur as any).default).toBe('defaultCommercial');
        expect(interlocuteur.getDefaultValue()).toBe('[[Léo Dupont]]');
    });

    it('un nouvel objet suivie pré-remplit l\'interlocuteur au bouton +', async () => {
        const objectProperty = configLoader.createProperty({
            propertyKey: 'suivie',
            type: 'ObjectProperty',
            properties: {
                date: { type: 'DateProperty' },
                interlocuteur: {
                    type: 'FileProperty',
                    classes: ['Commercial'],
                    defaultValue: 'defaultCommercial'
                },
                type: { type: 'SelectProperty', options: [{ name: 'Appel' }] },
                description: { type: 'TextProperty' }
            }
        } as any) as ObjectProperty;

        const container = document.createElement('div');
        const update = jest.fn().mockResolvedValue(undefined);

        await objectProperty.addProperty([], update as any, container);

        expect(update).toHaveBeenCalled();
        const newValues = update.mock.calls[0][0] as any[];
        expect(Array.isArray(newValues)).toBe(true);
        expect(newValues).toHaveLength(1);
        expect(newValues[0].interlocuteur).toBe('[[Léo Dupont]]');
    });
});
