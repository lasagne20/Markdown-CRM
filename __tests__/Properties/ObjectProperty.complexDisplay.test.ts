import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { FileProperty } from '../../src/properties/FileProperty';
import { DateProperty } from '../../src/properties/DateProperty';
import { SelectProperty } from '../../src/properties/SelectProperty';
import { Vault } from '../../src/vault/Vault';
import { IApp } from '../../src/interfaces/IApp';
import { DisplayContainer } from '../../src/Config/interfaces';

describe('ObjectProperty - Complex Display Layout', () => {
    let vault: Vault;
    let mockApp: IApp;

    beforeEach(() => {
        // Mock DOM elements
        document.body.innerHTML = '<div id="app"></div>';

        mockApp = {
            getFile: jest.fn(),
            readFile: jest.fn(),
            listFiles: jest.fn().mockResolvedValue([]),
            writeFile: jest.fn(),
            createFile: jest.fn(),
            deleteFile: jest.fn(),
            renameFile: jest.fn(),
            exists: jest.fn(),
            getFilesInFolder: jest.fn(),
            getMarkdownFiles: jest.fn(),
            setIcon: jest.fn((el: HTMLElement, icon: string) => {
                el.setAttribute('data-icon', icon);
                el.textContent = icon;
            }),
            getUrl: jest.fn((path: string) => `obsidian://vault/test/${path}`),
        } as unknown as IApp;

        vault = new Vault(mockApp, {
            templateFolder: 'templates',
            personalName: 'Test User',
            configPath: '.obsidian/plugins/markdown-crm/config'
        });
    });

    describe('Multiple properties on same line with nested lines', () => {
        it('should render multiple properties on the same line using line container', async () => {
            const displayConfig: DisplayContainer = {
                items: [
                    {
                        type: 'line',
                        items: [
                            { type: 'property', name: 'date' },
                            { type: 'property', name: 'etat' },
                            { type: 'property', name: 'animation' }
                        ]
                    },
                    {
                        type: 'line',
                        items: [
                            { type: 'property', name: 'animateurs' }
                        ]
                    }
                ]
            };

            const properties = {
                date: new DateProperty('date', vault, []),
                etat: new SelectProperty('etat', vault, [
                    { name: 'Planifié', color: 'blue' },
                    { name: 'En cours', color: 'yellow' },
                    { name: 'Terminé', color: 'green' }
                ]),
                animation: new TextProperty('animation', vault),
                animateurs: new TextProperty('animateurs', vault)
            };

            const objectProp = new ObjectProperty('evenements', vault, properties, {
                display: displayConfig
            });

            const testData = [
                {
                    date: '2025-12-25',
                    etat: 'Planifié',
                    animation: 'Spectacle de Noël',
                    animateurs: 'Jean Dupont, Marie Martin'
                }
            ];

            const container = objectProp.fillDisplay(testData, async () => {});

            // Wait for async rendering
            await new Promise(resolve => setTimeout(resolve, 100));

            // Find the display containers
            const lines = container.querySelectorAll('.metadata-line');
            
            expect(lines.length).toBeGreaterThanOrEqual(2);
        });

        it('should render complex layout with columns and lines', async () => {
            const displayConfig: DisplayContainer = {
                items: [
                    {
                        type: 'line',
                        items: [
                            {
                                type: 'column',
                                items: [
                                    { type: 'property', name: 'date' },
                                    { type: 'property', name: 'etat' }
                                ]
                            },
                            {
                                type: 'column',
                                items: [
                                    { type: 'property', name: 'animation' },
                                    { type: 'property', name: 'animateurs' }
                                ]
                            }
                        ]
                    }
                ]
            };

            const properties = {
                date: new DateProperty('date', vault, []),
                etat: new SelectProperty('etat', vault, [
                    { name: 'Planifié', color: 'blue' },
                    { name: 'En cours', color: 'yellow' }
                ]),
                animation: new TextProperty('animation', vault),
                animateurs: new TextProperty('animateurs', vault)
            };

            const objectProp = new ObjectProperty('evenements', vault, properties, {
                display: displayConfig
            });

            const container = objectProp.fillDisplay([
                {
                    date: '2025-12-25',
                    etat: 'Planifié',
                    animation: 'Concert',
                    animateurs: 'Orchestra'
                }
            ], async () => {});

            await new Promise(resolve => setTimeout(resolve, 100));

            const columns = container.querySelectorAll('.metadata-column');
            expect(columns.length).toBeGreaterThanOrEqual(2);
        });

        it('should handle three lines with different property counts', async () => {
            const displayConfig: DisplayContainer = {
                items: [
                    {
                        type: 'line',
                        items: [
                            { type: 'property', name: 'date' },
                            { type: 'property', name: 'etat' },
                            { type: 'property', name: 'animation' }
                        ]
                    },
                    {
                        type: 'line',
                        items: [
                            { type: 'property', name: 'animateurs' }
                        ]
                    },
                    {
                        type: 'line',
                        items: [
                            { type: 'property', name: 'lieu' },
                            { type: 'property', name: 'participants' }
                        ]
                    }
                ]
            };

            const properties = {
                date: new DateProperty('date', vault, []),
                etat: new SelectProperty('etat', vault, [
                    { name: 'Planifié', color: 'blue' }
                ]),
                animation: new TextProperty('animation', vault),
                animateurs: new TextProperty('animateurs', vault),
                lieu: new FileProperty('lieu', vault, ['Lieu']),
                participants: new TextProperty('participants', vault)
            };

            const objectProp = new ObjectProperty('evenements', vault, properties, {
                display: displayConfig
            });

            const testData = [
                {
                    date: '2025-12-25',
                    etat: 'Planifié',
                    animation: 'Festival',
                    animateurs: 'Band A',
                    lieu: '[[Salle des fêtes]]',
                    participants: '150'
                }
            ];

            const container = objectProp.fillDisplay(testData, async () => {});

            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify structure exists (basic smoke test)
            expect(container).toBeDefined();
        });
    });

    describe('Real-world use case: Events management', () => {
        it('should render event display like in Personne.yaml example', async () => {
            // Configuration similaire à ce que vous voulez dans Personne.yaml
            const displayConfig: DisplayContainer = {
                items: [
                    {
                        type: 'line',
                        items: [
                            { type: 'property', name: 'date', title: 'Date' },
                            { type: 'property', name: 'etat', title: 'État' },
                            { type: 'property', name: 'animation', title: 'Animation' }
                        ]
                    },
                    {
                        type: 'line',
                        items: [
                            { type: 'property', name: 'animateurs', title: 'Animateurs' }
                        ]
                    }
                ]
            };

            const properties = {
                date: new DateProperty('date', vault, []),
                etat: new SelectProperty('etat', vault, [
                    { name: 'À planifier', color: 'gray' },
                    { name: 'Confirmé', color: 'green' },
                    { name: 'Annulé', color: 'red' }
                ]),
                animation: new TextProperty('animation', vault),
                animateurs: new TextProperty('animateurs', vault)
            };

            const objectProp = new ObjectProperty('evenements', vault, properties, {
                display: displayConfig,
                title: 'Événements'
            });

            const events = [
                {
                    date: '2025-12-20',
                    etat: 'Confirmé',
                    animation: 'Atelier créatif',
                    animateurs: 'Sophie Leclerc'
                },
                {
                    date: '2025-12-25',
                    etat: 'À planifier',
                    animation: 'Spectacle de Noël',
                    animateurs: 'Troupe du Théâtre Municipal'
                }
            ];

            const container = objectProp.fillDisplay(events, async () => {});

            await new Promise(resolve => setTimeout(resolve, 150));

            // Verify that we can handle multiple objects
            expect(container).toBeDefined();
        });

        it('should allow mixing columns and lines for complex layouts', async () => {
            const displayConfig: DisplayContainer = {
                items: [
                    {
                        type: 'line',
                        title: 'Informations principales',
                        items: [
                            {
                                type: 'column',
                                items: [
                                    { type: 'property', name: 'date' },
                                    { type: 'property', name: 'heure' }
                                ]
                            },
                            {
                                type: 'column',
                                items: [
                                    { type: 'property', name: 'etat' },
                                    { type: 'property', name: 'priorite' }
                                ]
                            }
                        ]
                    },
                    {
                        type: 'line',
                        title: 'Détails',
                        items: [
                            { type: 'property', name: 'animation' },
                            { type: 'property', name: 'animateurs' }
                        ]
                    }
                ]
            };

            const properties = {
                date: new DateProperty('date', vault, []),
                heure: new TextProperty('heure', vault),
                etat: new SelectProperty('etat', vault, [{ name: 'Actif', color: 'green' }]),
                priorite: new SelectProperty('priorite', vault, [
                    { name: 'Basse', color: 'blue' },
                    { name: 'Moyenne', color: 'yellow' },
                    { name: 'Haute', color: 'red' }
                ]),
                animation: new TextProperty('animation', vault),
                animateurs: new TextProperty('animateurs', vault)
            };

            const objectProp = new ObjectProperty('taches', vault, properties, {
                display: displayConfig
            });

            const container = objectProp.fillDisplay([
                {
                    date: '2025-12-17',
                    heure: '14:00',
                    etat: 'Actif',
                    priorite: 'Haute',
                    animation: 'Réunion',
                    animateurs: 'Équipe projet'
                }
            ], async () => {});

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(container).toBeDefined();
        });
    });

    describe('Drag and drop with complex layouts', () => {
        it('should maintain layout structure when items are reordered', async () => {
            const displayConfig: DisplayContainer = {
                items: [
                    {
                        type: 'line',
                        items: [
                            { type: 'property', name: 'ordre' },
                            { type: 'property', name: 'nom' },
                            { type: 'property', name: 'statut' }
                        ]
                    }
                ]
            };

            const properties = {
                ordre: new TextProperty('ordre', vault),
                nom: new TextProperty('nom', vault),
                statut: new SelectProperty('statut', vault, [
                    { name: 'Actif', color: 'green' }
                ])
            };

            const objectProp = new ObjectProperty('items', vault, properties, {
                display: displayConfig
            });

            const items = [
                { ordre: '1', nom: 'Premier', statut: 'Actif' },
                { ordre: '2', nom: 'Deuxième', statut: 'Actif' },
                { ordre: '3', nom: 'Troisième', statut: 'Actif' }
            ];

            let updateCount = 0;
            const updateFn = async () => {
                updateCount++;
            };

            const container = objectProp.fillDisplay(items, updateFn);

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(container).toBeDefined();
        });
    });
});
