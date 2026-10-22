/**
 * Section `search` de la configuration de classe : personnalisation du
 * modal de recherche (chips de propriétés, tri, nettoyage du titre).
 *
 * La section passe telle quelle depuis le YAML ; ce test valide le
 * contrat : les champs properties / sort / sortDirection / titleTemplate
 * sont exposés sur la ClassConfig chargée, y compris les chips en forme
 * d'objet (name + color).
 */

import { ConfigLoader } from '../../src/Config/ConfigLoader';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

const ACTION_YAML = `
className: "Action"
classIcon: "smile-plus"

properties:
  date:
    type: "RangeDateProperty"
    derivedFrom: "animations.date"

  etat:
    type: "SelectProperty"
    options:
      - name: "Piste"
        color: "gray"
      - name: "Payé"
        color: "gold"

search:
  properties:
    - name: date
      color: "red"
    - etat
  sort: date
  sortDirection: desc
  titleTemplate: "{animations[0].date} - Action - {current}"
`;

describe('ConfigLoader - section search', () => {
    let configLoader: ConfigLoader;
    let app: any;

    beforeEach(() => {
        app = mockApp();
        const vault = new Vault(app, {
            vaultPath: './test-vault',
            configPath: './config'
        } as any);

        app.getFile = jest.fn().mockImplementation(async (filePath: string) => {
            if (filePath.includes('Action.yaml')) {
                return { path: filePath, name: 'Action.yaml', basename: 'Action', extension: 'yaml' };
            }
            return null;
        });
        app.readFile = jest.fn().mockImplementation(async () => ACTION_YAML);

        configLoader = new ConfigLoader('./config', vault);
    });

    test('la section search est chargée avec properties, sort, sortDirection et titleTemplate', async () => {
        const config = await configLoader.loadClassConfig('Action');

        expect(config.className).toBe('Action');
        expect(config.search).toBeDefined();
        expect(config.search!.sort).toBe('date');
        expect(config.search!.sortDirection).toBe('desc');
        expect(config.search!.titleTemplate).toBe('{animations[0].date} - Action - {current}');
    });

    test('les chips acceptent la forme string et la forme objet (name + color)', async () => {
        const config = await configLoader.loadClassConfig('Action');

        const chips = config.search!.properties!;
        expect(chips).toHaveLength(2);
        // Forme objet : {name, color}
        expect(chips[0]).toEqual({ name: 'date', color: 'red' });
        // Forme string : convertie en objet sans couleur
        expect(chips[1]).toEqual({ name: 'etat' });
    });
});
