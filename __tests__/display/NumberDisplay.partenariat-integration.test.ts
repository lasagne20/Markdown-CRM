/**
 * @jest-environment jsdom
 *
 * Tests d'integration du calcul "Nombre de communes desservies" avec la
 * configuration reelle de Partenariat.yaml :
 *   source: class Action (conditions partenariats.partenariat contains current)
 *   formula: countDistinct
 *   propertyName: financeurs.financeur.parent,clients.client.parent
 *
 * Modele de donnees reel (Action.yaml) : financeurs/clients sont des
 * ObjectProperty (arrays d'objets avec des liens [[...]]), et les communes
 * sont les parents des institutions lieees. La vraie chaine de navigation
 * (PropertyNavigator collect mode) est utilisee, sans mocks de getPropertyValue.
 */

import { NumberDisplay } from '../../src/display/NumberDisplay';
import { Vault } from '../../src/vault/Vault';
import { Classe } from '../../src/vault/Classe';
import { NumberDisplayItem } from '../../src/Config/interfaces';
import { mockApp } from '../utils/mocks';

class MockCommune extends Classe {
    constructor(vault: Vault, fileName: string) {
        super(vault);
        this.fileName = fileName;
    }

    private fileName: string;

    getName(withExtension: boolean = true): string {
        return withExtension ? `${this.fileName}.md` : this.fileName;
    }

    getFile() {
        return {
            getName: (withExtension: boolean = true) => this.getName(withExtension),
            name: this.fileName,
            basename: this.fileName
        } as any;
    }

    async getMetadata(): Promise<Record<string, any>> {
        return { nom: this.fileName };
    }
}

class MockInstitution extends Classe {
    constructor(vault: Vault, fileName: string, parentCommune: MockCommune | null) {
        super(vault);
        this.fileName = fileName;
        this.parentCommune = parentCommune;
    }

    private fileName: string;
    private parentCommune: MockCommune | null;

    getName(withExtension: boolean = true): string {
        return withExtension ? `${this.fileName}.md` : this.fileName;
    }

    getFile() {
        return {
            getName: (withExtension: boolean = true) => this.getName(withExtension),
            name: this.fileName,
            basename: this.fileName
        } as any;
    }

    async getMetadata(): Promise<Record<string, any>> {
        return { nom: this.fileName };
    }

    async getParent(): Promise<Classe | null> {
        return this.parentCommune;
    }
}

class MockPartenariat extends Classe {
    constructor(vault: Vault, fileName: string) {
        super(vault);
        this.fileName = fileName;
    }

    private fileName: string;

    getName(withExtension: boolean = true): string {
        return withExtension ? `${this.fileName}.md` : this.fileName;
    }

    getFile() {
        return {
            getName: (withExtension: boolean = true) => this.getName(withExtension),
            name: this.fileName,
            basename: this.fileName
        } as any;
    }

    async getMetadata(): Promise<Record<string, any>> {
        return { nom: this.fileName };
    }
}

class MockAction extends Classe {
    constructor(
        vault: Vault,
        fileName: string,
        financeurs: MockInstitution[],
        clients: MockInstitution[],
        partenariats: MockPartenariat[] = []
    ) {
        super(vault);
        this.fileName = fileName;
        this.financeurs = financeurs;
        this.clients = clients;
        this.partenariats = partenariats;
    }

    private fileName: string;
    private financeurs: MockInstitution[];
    private clients: MockInstitution[];
    private partenariats: MockPartenariat[];

    getName(withExtension: boolean = true): string {
        return withExtension ? `${this.fileName}.md` : this.fileName;
    }

    getFile() {
        return {
            getName: (withExtension: boolean = true) => this.getName(withExtension),
            name: this.fileName,
            basename: this.fileName
        } as any;
    }

    // Modele reel (Action.yaml) : ObjectProperty arrays d'objets
    async getMetadata(): Promise<Record<string, any>> {
        return {
            financeurs: this.financeurs.map(f => ({ financeur: `[[${f.getName()}]]` })),
            clients: this.clients.map(c => ({ client: `[[${c.getName()}]]` })),
            partenariats: this.partenariats.map(p => ({ partenariat: `[[${p.getName()}]]` })),
            etat: 'Réalisé'
        };
    }
}

describe('NumberDisplay - Partenariat Integration Test', () => {
    let vault: Vault;
    let commune1: MockCommune;
    let commune2: MockCommune;
    let commune3: MockCommune;
    let institution1: MockInstitution;
    let institution2: MockInstitution;
    let institution3: MockInstitution;
    let partenariat1: MockPartenariat;
    let action1: MockAction;
    let action2: MockAction;
    let action3: MockAction;

    beforeEach(() => {
        const app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);

        commune1 = new MockCommune(vault, 'Commune1');
        commune2 = new MockCommune(vault, 'Commune2');
        commune3 = new MockCommune(vault, 'Commune3');

        institution1 = new MockInstitution(vault, 'Institution1', commune1);
        institution2 = new MockInstitution(vault, 'Institution2', commune2);
        institution3 = new MockInstitution(vault, 'Institution3', commune3);

        partenariat1 = new MockPartenariat(vault, 'Partenariat1');

        // Action1: financeur Commune1, client Commune2
        action1 = new MockAction(vault, 'Action1', [institution1], [institution2], [partenariat1]);
        // Action2: financeur Commune2, client Commune3
        action2 = new MockAction(vault, 'Action2', [institution2], [institution3], [partenariat1]);
        // Action3: financeur et client dans Commune1 (doublon)
        action3 = new MockAction(vault, 'Action3', [institution1], [institution1], [partenariat1]);

        (vault as any).getFromLink = jest.fn(async (link: string) => {
            if (link.includes('Institution1')) return institution1;
            if (link.includes('Institution2')) return institution2;
            if (link.includes('Institution3')) return institution3;
            if (link.includes('Partenariat1')) return partenariat1;
            return null;
        });
    });

    describe('Partenariat configuration: countDistinct communes from financeurs and clients', () => {
        test('should count distinct communes from financeurs.financeur.parent,clients.client.parent', async () => {
            const value = await (NumberDisplay as any).calculateValue(
                [action1, action2, action3],
                'countDistinct',
                'financeurs.financeur.parent,clients.client.parent',
                undefined,
                partenariat1 as any
            );

            // Action1: C1 + C2, Action2: C2 + C3, Action3: C1 + C1
            // Communes distinctes: C1, C2, C3
            expect(value).toBe(3);
        });

        test('should work with user configuration from Partenariat.yaml', async () => {
            const getFilesForTable = jest.fn().mockResolvedValue([action1, action2, action3]);

            const numberItem: NumberDisplayItem = {
                type: 'number',
                source: {
                    class: 'Action',
                    conditions: [
                        { property: 'partenariats.partenariat', type: 'contains', value: 'current' },
                        { property: 'etat', type: 'notEquals', value: 'Annulé' }
                    ]
                },
                formula: 'countDistinct',
                propertyName: 'financeurs.financeur.parent,clients.client.parent',
                title: 'Nombre de communes desservies',
                icon: 'map-pin'
            };

            const display = await NumberDisplay.fromConfig(
                numberItem,
                vault,
                partenariat1 as any,
                getFilesForTable
            );

            expect(display).toBeInstanceOf(NumberDisplay);
            expect(display.options.value).toBe(3);
        });
    });

    describe('Edge cases and error handling', () => {
        test('should handle missing parent gracefully', async () => {
            // Institution sans commune parente
            const institutionNoParent = new MockInstitution(vault, 'InstitutionNoParent', null);
            (vault as any).getFromLink = jest.fn(async (link: string) => {
                if (link.includes('Institution1')) return institution1;
                if (link.includes('InstitutionNoParent')) return institutionNoParent;
                return null;
            });

            const actionMixed = new MockAction(
                vault, 'ActionMixed', [institution1], [institutionNoParent], [partenariat1]
            );

            const value = await (NumberDisplay as any).calculateValue(
                [actionMixed],
                'countDistinct',
                'financeurs.financeur.parent,clients.client.parent',
                undefined,
                partenariat1 as any
            );

            // Seule Commune1 (le client sans parent est ignore)
            expect(value).toBe(1);
        });

        test('should handle empty property values', async () => {
            const actionEmpty = new MockAction(vault, 'ActionEmpty', [], [], [partenariat1]);

            const value = await (NumberDisplay as any).calculateValue(
                [actionEmpty],
                'countDistinct',
                'financeurs.financeur.parent,clients.client.parent',
                undefined,
                partenariat1 as any
            );

            expect(value).toBe(0);
        });

        test('should work with single property (backward compatibility)', async () => {
            const value = await (NumberDisplay as any).calculateValue(
                [action1],
                'countDistinct',
                'financeurs.financeur.parent',
                undefined,
                partenariat1 as any
            );

            expect(value).toBe(1); // Commune1
        });
    });
});
