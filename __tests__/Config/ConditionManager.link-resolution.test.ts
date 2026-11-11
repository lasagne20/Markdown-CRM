import { ConditionManager, ContainsCondition } from '../../src/Config/ConditionManager';
import { Classe } from '../../src/vault/Classe';

/**
 * Résolution de liens fichiers dans les chemins imbriqués des conditions.
 *
 * Un chemin comme "postes.institution.type" doit pouvoir lire le type de
 * l'institution liée : en cours de navigation, la valeur "postes[i].institution"
 * est une chaîne "[[Fichier]]" ; la suite du chemin doit la résoudre en Classe
 * et évaluer les parties restantes sur ce fichier.
 */
describe('ConditionManager - résolution de liens dans les chemins imbriqués', () => {
    let mockApp: any;
    let mockVault: any;
    let conditionManager: ConditionManager;
    let personne: Classe;
    let mairieClasse: any;
    let postesData: any[];

    beforeEach(() => {
        mockApp = {
            getVaultPath: jest.fn().mockReturnValue('/vault'),
            getName: jest.fn().mockReturnValue('TestVault'),
            listFiles: jest.fn().mockResolvedValue([]),
        };

        // Classe liée : la Mairie/Commune ciblée par le lien
        mairieClasse = {
            name: 'Vizille',
            getPropertyValue: jest.fn().mockImplementation(async (path: string) => {
                if (path === 'type') { return 'Commune'; }
                if (path === 'lieu.type') { return 'Commune'; }
                return null;
            }),
        };

        mockVault = {
            app: mockApp,
            getFromLink: jest.fn().mockResolvedValue(mairieClasse),
        };

        conditionManager = new ConditionManager(mockVault as any);

        personne = new Classe(mockApp as any);
        (personne as any).name = 'Jean';

        postesData = [
            { institution: '[[Vizille]]', poste: 'Maire' },
        ];

        const postesProp = {
            type: 'object',
            name: 'postes',
            read: jest.fn().mockResolvedValue(postesData),
        };

        jest.spyOn(personne, 'getProperty').mockImplementation((propName: string) => {
            if (propName === 'postes') { return postesProp as any; }
            return undefined;
        });
    });

    it('lit le type de l\'institution liée : postes.institution.type', async () => {
        const condition: ContainsCondition = {
            property: 'postes.institution.type',
            type: 'contains',
            value: '"Commune"',
        };
        const result = await conditionManager.evaluateCondition(condition, personne);
        expect(result).toBe(true);
    });

    it('retourne faux quand le type de l\'institution liée ne correspond pas', async () => {
        const condition: ContainsCondition = {
            property: 'postes.institution.type',
            type: 'contains',
            value: '"Entreprise"',
        };
        const result = await conditionManager.evaluateCondition(condition, personne);
        expect(result).toBe(false);
    });

    it('ne résout pas un lien lorsqu\'on est arrivé sur la feuille (postes.institution reste une liste de noms)', async () => {
        const condition: ContainsCondition = {
            property: 'postes.institution',
            type: 'contains',
            value: 'Vizille',
        };
        const result = await conditionManager.evaluateCondition(condition, personne);
        expect(result).toBe(true);
        expect(mockVault.getFromLink).not.toHaveBeenCalled();
    });

    it('délègue les parties restantes multi-niveaux au fichier lié (postes.institution.lieu.type)', async () => {
        const condition: ContainsCondition = {
            property: 'postes.institution.lieu.type',
            type: 'contains',
            value: '"Commune"',
        };
        const result = await conditionManager.evaluateCondition(condition, personne);
        expect(result).toBe(true);
        expect(mairieClasse.getPropertyValue).toHaveBeenCalledWith('lieu.type');
    });

    it('retourne faux sans lever d\'erreur quand le lien est cassé', async () => {
        mockVault.getFromLink = jest.fn().mockResolvedValue(null);
        const condition: ContainsCondition = {
            property: 'postes.institution.type',
            type: 'contains',
            value: '"Commune"',
        };
        const result = await conditionManager.evaluateCondition(condition, personne);
        expect(result).toBe(false);
    });

    it('retourne faux sans lever d\'erreur quand le vault ne fournit pas getFromLink', async () => {
        const bareManager = new ConditionManager({ app: mockApp } as any);
        const condition: ContainsCondition = {
            property: 'postes.institution.type',
            type: 'contains',
            value: '"Commune"',
        };
        const result = await bareManager.evaluateCondition(condition, personne);
        expect(result).toBe(false);
    });

    it('navigue aussi depuis une propriété objet non-liste', async () => {
        const adresseProp = {
            type: 'object',
            name: 'adresse',
            read: jest.fn().mockResolvedValue({ mairie: '[[Vizille]]' }),
        };
        jest.spyOn(personne, 'getProperty').mockImplementation((propName: string) => {
            if (propName === 'adresse') { return adresseProp as any; }
            return undefined;
        });

        const condition: ContainsCondition = {
            property: 'adresse.mairie.type',
            type: 'contains',
            // Résultat unique (pas une liste) : pas d'astuce de guillemets JSON
            value: 'Commune',
        };
        const result = await conditionManager.evaluateCondition(condition, personne);
        expect(result).toBe(true);
    });

    it('conserve la navigation par clés sur les objets imbriqués sans lien', async () => {
        const suivieProp = {
            type: 'object',
            name: 'suivie',
            read: jest.fn().mockResolvedValue([
                { date: '2026-01-10', type: 'Appel', description: 'Premier appel' },
            ]),
        };
        jest.spyOn(personne, 'getProperty').mockImplementation((propName: string) => {
            if (propName === 'suivie') { return suivieProp as any; }
            if (propName === 'postes') {
                return { type: 'object', name: 'postes', read: jest.fn().mockResolvedValue(postesData) } as any;
            }
            return undefined;
        });

        const condition: ContainsCondition = {
            property: 'suivie.type',
            type: 'contains',
            value: '"Appel"',
        };
        const result = await conditionManager.evaluateCondition(condition, personne);
        expect(result).toBe(true);
    });
});
