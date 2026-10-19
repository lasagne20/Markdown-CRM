/**
 * @jest-environment jsdom
 *
 * Tests du support multi-propriétés du NumberDisplay (syntaxe à virgule),
 * avec le VRAI modèle de données et la vraie navigation (collect mode) :
 *   financeurs: [{ financeur: "[[Institution]]" }] (ObjectProperty du config Action.yaml)
 *   clients: [{ client: "[[Institution]]" }]
 * Les communes sont résolues via .parent des institutions liées.
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

class MockAction extends Classe {
    constructor(
        vault: Vault,
        fileName: string,
        financeurs: MockInstitution[],
        clients: MockInstitution[]
    ) {
        super(vault);
        this.fileName = fileName;
        this.financeurs = financeurs;
        this.clients = clients;
    }

    private fileName: string;
    private financeurs: MockInstitution[];
    private clients: MockInstitution[];

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

    // Modele reel (comme Action.yaml) : ObjectProperty arrays d'objets
    async getMetadata(): Promise<Record<string, any>> {
        return {
            financeurs: this.financeurs.map(f => ({ financeur: `[[${f.getName()}]]` })),
            clients: this.clients.map(c => ({ client: `[[${c.getName()}]]` }))
        };
    }
}

describe('NumberDisplay Multi-Property Support', () => {
    let vault: Vault;
    let commune1: MockCommune;
    let commune2: MockCommune;
    let commune3: MockCommune;
    let institution1: MockInstitution;
    let institution2: MockInstitution;
    let institution3: MockInstitution;
    let action1: MockAction;
    let action2: MockAction;

    beforeEach(() => {
        const app = mockApp();
        vault = new Vault(app, { vaultPath: './test-vault' } as any);

        commune1 = new MockCommune(vault, 'Commune1');
        commune2 = new MockCommune(vault, 'Commune2');
        commune3 = new MockCommune(vault, 'Commune3');

        institution1 = new MockInstitution(vault, 'Institution1', commune1);
        institution2 = new MockInstitution(vault, 'Institution2', commune2);
        institution3 = new MockInstitution(vault, 'Institution3', commune3);

        // Action1: financeur Commune1, client Commune2
        action1 = new MockAction(vault, 'Action1', [institution1], [institution2]);
        // Action2: financeur Commune2, client Commune3
        action2 = new MockAction(vault, 'Action2', [institution2], [institution3]);

        (vault as any).getFromLink = jest.fn(async (link: string) => {
            if (link.includes('Institution1')) return institution1;
            if (link.includes('Institution2')) return institution2;
            if (link.includes('Institution3')) return institution3;
            return null;
        });
    });

    describe('Multiple properties with comma syntax', () => {
        test('should handle single property with .parent', async () => {
            const value = await (NumberDisplay as any).calculateValue(
                [action1],
                'countDistinct',
                'financeurs.financeur.parent',
                undefined,
                action1
            );

            expect(value).toBe(1); // Commune1
        });

        test('should handle multiple properties separated by comma', async () => {
            const value = await (NumberDisplay as any).calculateValue(
                [action1],
                'countDistinct',
                'financeurs.financeur.parent,clients.client.parent',
                undefined,
                action1
            );

            // Commune1 (financeurs) + Commune2 (clients)
            expect(value).toBe(2);
        });

        test('should count distinct communes across multiple actions with multiple properties', async () => {
            const value = await (NumberDisplay as any).calculateValue(
                [action1, action2],
                'countDistinct',
                'financeurs.financeur.parent,clients.client.parent',
                undefined,
                undefined
            );

            // Commune1 + Commune2 + Commune3
            expect(value).toBe(3);
        });

        test('should handle empty values gracefully', async () => {
            // Action sans clients
            const actionNoClients = new MockAction(vault, 'ActionNoClients', [institution1], []);

            const value = await (NumberDisplay as any).calculateValue(
                [actionNoClients],
                'countDistinct',
                'financeurs.financeur.parent,clients.client.parent',
                undefined,
                actionNoClients
            );

            // Seule Commune1 (via financeurs), clients vide ignore
            expect(value).toBe(1);
        });

        test('should handle duplicate communes across properties', async () => {
            // Financeur et client dans la meme commune
            const actionDuplicate = new MockAction(
                vault, 'ActionDuplicate', [institution1], [institution1]
            );

            const value = await (NumberDisplay as any).calculateValue(
                [actionDuplicate],
                'countDistinct',
                'financeurs.financeur.parent,clients.client.parent',
                undefined,
                actionDuplicate
            );

            // Commune1 comptee une seule fois
            expect(value).toBe(1);
        });

        test('should work with count formula', async () => {
            const value = await (NumberDisplay as any).calculateValue(
                [action1],
                'count',
                'financeurs.financeur.parent,clients.client.parent',
                undefined,
                action1
            );

            // Compte total des occurrences (2), pas les uniques
            expect(value).toBe(2);
        });
    });

    describe('Integration with full NumberDisplay', () => {
        test('should create NumberDisplay with multi-property countDistinct', async () => {
            const getFilesForTable = jest.fn().mockResolvedValue([action1]);

            const numberItem: NumberDisplayItem = {
                type: 'number',
                source: { class: 'Action' },
                formula: 'countDistinct',
                propertyName: 'financeurs.financeur.parent,clients.client.parent',
                title: 'Nombre de communes desservies'
            };

            const display = await NumberDisplay.fromConfig(
                numberItem,
                vault,
                action1 as any,
                getFilesForTable
            );

            expect(display).toBeInstanceOf(NumberDisplay);
            expect(display.options.value).toBe(2); // Commune1 + Commune2
        });
    });
});
