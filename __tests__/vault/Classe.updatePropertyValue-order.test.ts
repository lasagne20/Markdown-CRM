/**
 * Ordre des effets de bord de updatePropertyValue.
 *
 * Le re-rendu des propriétés calculées (onPropertyChanged) ne doit PAS attendre
 * la fin des processus onPropertyChange (renames, moves de dossiers...) : ces
 * processus peuvent être lents (écriture de fichier, scan de dossiers), ce qui
 * se traduisait par un "temps de retard" visible sur la date dérivée au
 * premier edit après ouverture de la page.
 *
 * La notification doit donc partir AVANT les processus.
 */

import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';
import { mockApp } from '../utils/mocks';

describe('Classe.updatePropertyValue - ordre notification vs processus', () => {
    test('PLANTE : onPropertyChanged est notifié AVANT les processus onPropertyChange', async () => {
        const metadataStore: Record<string, any> = {
            'Test Action.md': {
                classe: 'Action',
                etat: 'Piste'
            }
        };

        const app = {
            ...mockApp(),
            getMetadata: jest.fn((ifile: any) => Promise.resolve(metadataStore[ifile.path] ?? {})),
            updateMetadata: jest.fn((ifile: any, data: any) => {
                metadataStore[ifile.path] = data;
                return Promise.resolve();
            })
        } as any;

        const vault = new Vault(app, { vaultPath: './test-vault', configPath: './config' } as any);
        const iFile = {
            path: 'Test Action.md',
            name: 'Test Action.md',
            basename: 'Test Action',
            extension: 'md',
            parent: { path: '' }
        } as any;

        const classe = new Classe(vault, iFile);
        (classe as any).name = 'Action';

        const calls: string[] = [];
        (vault as any).getProcessManager = () => ({
            runProcesses: jest.fn(async () => {
                calls.push('processes');
            })
        });
        classe.onPropertyChanged = async () => {
            calls.push('notify');
        };

        await classe.updatePropertyValue('etat', 'Payé');

        expect(calls).toEqual(['notify', 'processes']);
    });
});
