/**
 * UpdatePropertyAction : action de process qui définit la valeur d'une
 * propriété sur l'instance.
 *
 * Cas d'usage : à la création d'une Institution, un process lit le nom du
 * fichier (NameProperty) et pré-remplit le type ("Ecole", "Collège", ...)
 * si le nom contient un mot-clé.
 */

import { ProcessManager } from '../../src/Config/ProcessManager';
import { ConditionManager } from '../../src/Config/ConditionManager';
import { Classe } from '../../src/vault/Classe';
import { NameProperty } from '../../src/properties/NameProperty';

describe('ProcessManager - UpdatePropertyAction', () => {
    let mockApp: any;
    let mockVault: any;
    let processManager: ProcessManager;
    let institution: Classe;

    beforeEach(() => {
        mockApp = {
            getVaultPath: jest.fn().mockReturnValue('/vault'),
            getName: jest.fn().mockReturnValue('TestVault'),
            listFiles: jest.fn().mockResolvedValue([]),
            setIcon: jest.fn()
        };

        mockVault = {
            app: mockApp,
            conditionManager: new ConditionManager(mockVault),
            getDynamicClassFactory: jest.fn().mockReturnValue(null)
        };

        processManager = new ProcessManager(mockVault as any);

        institution = new Classe(mockApp as any);
        (institution as any).name = 'Ecole du Village';

        // NameProperty : lit le nom du fichier
        const nameProp = new NameProperty(mockVault as any);
        jest.spyOn(institution, 'getProperty').mockImplementation((propName: string) => {
            if (propName === 'name') { return nameProp as any; }
            return undefined;
        });
        // NameProperty.read appelle classe.getFile() : maquiller le fichier
        (institution as any).getFile = jest.fn().mockReturnValue({
            getLink: () => '[[Ecole du Village]]'
        });
    });

    const autoTypeProcess = (keyword: string, type: string) => ({
        name: `AutoType${type}`,
        description: `Type ${type} si le nom contient "${keyword}"`,
        triggers: ['onCreate' as const],
        conditions: [
            { property: 'name', type: 'contains' as const, value: keyword }
        ],
        actions: [
            { type: 'UpdatePropertyAction' as const, property: 'type', value: type }
        ]
    });

    it('définit la propriété quand la condition matche le nom', async () => {
        const updateSpy = jest.fn().mockResolvedValue(undefined);
        (institution as any).updatePropertyValue = updateSpy;

        await processManager.execute(autoTypeProcess('cole', 'Ecole') as any, institution);

        expect(updateSpy).toHaveBeenCalledTimes(1);
        expect(updateSpy).toHaveBeenCalledWith('type', 'Ecole');
    });

    it('ne fait rien quand la condition ne matche pas', async () => {
        const updateSpy = jest.fn().mockResolvedValue(undefined);
        (institution as any).updatePropertyValue = updateSpy;

        await processManager.execute(autoTypeProcess('ollège', 'Collège') as any, institution);

        expect(updateSpy).not.toHaveBeenCalled();
    });

    it('chaque variante de mot-clé a son propre process (EHPAD)', async () => {
        const updateSpy = jest.fn().mockResolvedValue(undefined);
        (institution as any).updatePropertyValue = updateSpy;

        await processManager.execute(autoTypeProcess('hpad', 'EHPAD') as any, institution);
        expect(updateSpy).not.toHaveBeenCalled();

        (institution as any).getFile = jest.fn().mockReturnValue({
            getLink: () => '[[EHPAD Les Tilleuls]]'
        });
        await processManager.execute(autoTypeProcess('HPAD', 'EHPAD') as any, institution);
        expect(updateSpy).toHaveBeenCalledWith('type', 'EHPAD');
    });
});
