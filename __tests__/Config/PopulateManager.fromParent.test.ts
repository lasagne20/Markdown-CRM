/**
 * @jest-environment jsdom
 *
 * PopulateManager - heritage des proprietes du parent (fromParent) :
 * une entree populate avec fromParent copie la propriete du parent
 * au lieu de la demander a l'utilisateur (ex: Modele3D herite du parent).
 */

import { PopulateManager } from '../../src/Config/PopulateManager';
import { ClassConfig } from '../../src/Config/interfaces';

describe('PopulateManager - fromParent', () => {
    let manager: PopulateManager;
    let mockVault: any;
    let mockParent: any;
    let classConfig: ClassConfig;

    beforeEach(() => {
        mockVault = {
            getExtendedClasses: jest.fn().mockResolvedValue(['Assemblage']),
            app: {
                selectFile: jest.fn(),
                selectFromList: jest.fn(),
                sendNotice: jest.fn(),
                getSettings: jest.fn().mockReturnValue({})
            }
        };

        manager = new PopulateManager(mockVault);

        mockParent = {
            getPropertyValue: jest.fn().mockImplementation(async (prop: string) => {
                if (prop === 'Modele3D') {
                    return '[[I - Impulsion/SOCLE/3D/SOCLE.FCStd|SOCLE.FCStd]]';
                }
                return undefined;
            })
        };

        classConfig = {
            className: 'Piece',
            classIcon: 'puzzle',
            properties: {
                Parent: { type: 'FileProperty', title: 'Parent', classes: ['Assemblage'] },
                Modele3D: { type: 'ThreeDModelProperty', title: 'Modele3D' }
            },
            populate: [
                { property: 'Parent', title: 'Sélectionner le parent' },
                { property: 'Modele3D', fromParent: true }
            ]
        };
    });

    it('devrait heriter la propriete du parent sans demander (fromParent)', async () => {
        const values = await manager.populateProperties(classConfig, { Parent: '[[SOCLE|SOCLE]]' }, mockParent);

        expect(mockVault.app.selectFile).not.toHaveBeenCalled();
        expect(values?.['Modele3D']).toBe('[[I - Impulsion/SOCLE/3D/SOCLE.FCStd|SOCLE.FCStd]]');
    });

    it('ne devrait rien heriter si aucun parent fourni (pas de prompt)', async () => {
        // Parent fourni pour isoler l entree fromParent (sinon l entree Parent prompte normalement)
        const values = await manager.populateProperties(classConfig, { Parent: '[[SOCLE|SOCLE]]' }, undefined);

        expect(mockVault.app.selectFile).not.toHaveBeenCalled();
        expect(values?.['Modele3D']).toBeUndefined();
    });

    it('ne devrait pas ecraser une valeur deja fournie (existingProperties gagne)', async () => {
        const values = await manager.populateProperties(
            classConfig,
            { Parent: '[[SOCLE|SOCLE]]', Modele3D: '[[deja-la.FCStd|deja-la.FCStd]]' },
            mockParent
        );

        expect(values?.['Modele3D']).toBeUndefined();
    });

    it('ne devrait rien stocker si la propriete du parent est vide', async () => {
        mockParent.getPropertyValue.mockResolvedValue(undefined);

        const values = await manager.populateProperties(classConfig, { Parent: '[[SOCLE|SOCLE]]' }, mockParent);

        expect(values?.['Modele3D']).toBeUndefined();
    });

    it('ne devrait pas toucher aux entrees populate normales (sans fromParent)', async () => {
        mockVault.app.selectFile.mockResolvedValue({ getLink: () => '[[X|X]]' });

        await manager.populateProperties(classConfig, {}, mockParent);

        // L'entree Parent (sans fromParent) doit etre demandee
        expect(mockVault.app.selectFile).toHaveBeenCalled();
    });
});
