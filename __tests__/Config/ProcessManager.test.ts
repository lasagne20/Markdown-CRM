import { ConditionManager } from '../../src/Config/ConditionManager';
import { ProcessManager } from '../../src/Config/ProcessManager';
import { Classe } from '../../src/vault/Classe';
import { Vault } from '../../src/vault/Vault';
import { File } from '../../src/vault/File';

describe('ProcessManager', () => {
    let processManager: ProcessManager;
    let conditionManager: ConditionManager;
    let mockVault: any;
    let mockInstance: Classe;
    let mockFile: File;

    beforeEach(() => {
        // Mock Vault
        mockVault = {
            app: {
                getSettings: jest.fn().mockReturnValue({
                    classePropertyName: 'Classe'
                }),
                getMetadata: jest.fn().mockResolvedValue({}),
                updateMetadata: jest.fn().mockResolvedValue(undefined),
                createDiv: jest.fn((className?: string) => {
                    const div = document.createElement('div');
                    if (className) div.className = className;
                    return div;
                }),
                setIcon: jest.fn((element: HTMLElement, icon: string) => {
                    element.setAttribute('data-icon', icon);
                }),
                needDisplayRefresh: jest.fn(),
                open: jest.fn(),
                getCurrentFile: jest.fn().mockReturnValue({ path: 'test/path.md' })
            },
            files: {},
            getClasseFromName: jest.fn(),
            createFile: jest.fn(),
            getFromFile: jest.fn(),
            getFromLink: jest.fn(),
            updateFileFromData: jest.fn().mockResolvedValue(undefined),
            getDynamicClassFactory: jest.fn().mockReturnValue({
                getClass: jest.fn().mockResolvedValue(Classe),
                getClassConfig: jest.fn(),
                getConfigManager: jest.fn().mockReturnValue({
                    loadClassData: jest.fn().mockResolvedValue([])
                })
            })
        };

        // Mock File
        mockFile = {
            updateMetadata: jest.fn(),
            getMetadata: jest.fn().mockResolvedValue({}),
            getClassePropertyValue: jest.fn().mockResolvedValue('Personne'),
            path: 'test/path.md'
        } as any;

        // Mock Classe instance
        mockInstance = new Classe(mockVault, mockFile);

        processManager = new ProcessManager(mockVault);
        conditionManager = new ConditionManager();
    });

    describe('ConditionManager', () => {
        it('should evaluate equals condition correctly', async () => {
            // Add a property to the instance
            const mockProperty = {
                name: 'relation',
                read: jest.fn().mockResolvedValue('Salarié')
            } as any;
            mockInstance.addProperty(mockProperty);

            const condition = {
                property: 'relation',
                type: 'equals' as const,
                value: 'Salarié'
            };

            const result = await conditionManager.evaluateCondition(condition, mockInstance);
            expect(result).toBe(true);
        });

        it('should evaluate equalsAny condition correctly', async () => {
            const mockProperty = {
                name: 'status',
                read: jest.fn().mockResolvedValue('Active')
            } as any;
            mockInstance.addProperty(mockProperty);

            const condition = {
                property: 'status',
                type: 'equalsAny' as const,
                values: ['Active', 'Pending', 'Approved']
            };

            const result = await conditionManager.evaluateCondition(condition, mockInstance);
            expect(result).toBe(true);
        });

        it('should evaluate isEmpty condition correctly', async () => {
            const mockProperty = {
                name: 'description',
                read: jest.fn().mockResolvedValue('')
            } as any;
            mockInstance.addProperty(mockProperty);

            const condition = {
                property: 'description',
                type: 'isEmpty' as const
            };

            const result = await conditionManager.evaluateCondition(condition, mockInstance);
            expect(result).toBe(true);
        });

        it('should evaluate greaterThan condition correctly', async () => {
            const mockProperty = {
                name: 'age',
                read: jest.fn().mockResolvedValue(25)
            } as any;
            mockInstance.addProperty(mockProperty);

            const condition = {
                property: 'age',
                type: 'greaterThan' as const,
                value: 18
            };

            const result = await conditionManager.evaluateCondition(condition, mockInstance);
            expect(result).toBe(true);
        });

        it('should evaluate multiple conditions with AND logic', async () => {
            const mockProperty1 = {
                name: 'relation',
                read: jest.fn().mockResolvedValue('Salarié')
            } as any;
            const mockProperty2 = {
                name: 'status',
                read: jest.fn().mockResolvedValue('Active')
            } as any;
            mockInstance.addProperty(mockProperty1);
            mockInstance.addProperty(mockProperty2);

            const conditions = [
                {
                    property: 'relation',
                    type: 'equals' as const,
                    value: 'Salarié'
                },
                {
                    property: 'status',
                    type: 'equals' as const,
                    value: 'Active'
                }
            ];

            const result = await conditionManager.evaluateConditions(conditions, mockInstance);
            expect(result).toBe(true);
        });

        it('should return false when one condition fails', async () => {
            const mockProperty1 = {
                name: 'relation',
                read: jest.fn().mockResolvedValue('Salarié')
            } as any;
            const mockProperty2 = {
                name: 'status',
                read: jest.fn().mockResolvedValue('Inactive')
            } as any;
            mockInstance.addProperty(mockProperty1);
            mockInstance.addProperty(mockProperty2);

            const conditions = [
                {
                    property: 'relation',
                    type: 'equals' as const,
                    value: 'Salarié'
                },
                {
                    property: 'status',
                    type: 'equals' as const,
                    value: 'Active'
                }
            ];

            const result = await conditionManager.evaluateConditions(conditions, mockInstance);
            expect(result).toBe(false);
        });
    });

    describe('ProcessManager - UpdateClassAction', () => {
        it('should execute UpdateClassAction when conditions are met', async () => {
            const mockProperty = {
                name: 'relation',
                read: jest.fn().mockResolvedValue('Salarié')
            } as any;
            mockInstance.addProperty(mockProperty);

            const classConfig = {
                className: 'Personne',
                classIcon: '👤',
                properties: {},
                process: [
                    {
                        name: 'ClassChangeProcess',
                        description: 'Met à jour la classe en fonction de la relation',
                        triggers: ['onPropertyChange' as const],
                        conditions: [
                            {
                                property: 'relation',
                                type: 'equals' as const,
                                value: 'Salarié'
                            }
                        ],
                        actions: [
                            {
                                type: 'UpdateClassAction' as const,
                                newClass: 'Salarié'
                            }
                        ]
                    }
                ]
            };

            // Mock getClassConfig to return the config
            mockVault.getDynamicClassFactory().getClassConfig.mockResolvedValue(classConfig);

            await processManager.runProcesses('Personne', mockInstance, 'onPropertyChange', 'relation');

            expect(mockVault.app.updateMetadata).toHaveBeenCalledWith(mockFile, { 'Classe': 'Salarié' });
        });

        it('should skip process when trigger does not match', async () => {
            const mockProperty = {
                name: 'relation',
                read: jest.fn().mockResolvedValue('Salarié')
            } as any;
            mockInstance.addProperty(mockProperty);

            const classConfig = {
                className: 'Personne',
                classIcon: '👤',
                properties: {},
                process: [
                    {
                        name: 'ClassChangeProcess',
                        triggers: ['onCreate' as const],
                        conditions: [
                            {
                                property: 'relation',
                                type: 'equals' as const,
                                value: 'Salarié'
                            }
                        ],
                        actions: [
                            {
                                type: 'UpdateClassAction' as const,
                                newClass: 'Salarié'
                            }
                        ]
                    }
                ]
            };

            mockVault.getDynamicClassFactory().getClassConfig.mockResolvedValue(classConfig);

            await processManager.runProcesses('Personne', mockInstance, 'onUpdate');

            expect(mockFile.updateMetadata).not.toHaveBeenCalled();
        });

        it('should skip process when conditions are not met', async () => {
            const mockProperty = {
                name: 'relation',
                read: jest.fn().mockResolvedValue('Client')
            } as any;
            mockInstance.addProperty(mockProperty);

            const classConfig = {
                className: 'Personne',
                classIcon: '👤',
                properties: {},
                process: [
                    {
                        name: 'ClassChangeProcess',
                        triggers: ['onPropertyChange' as const],
                        conditions: [
                            {
                                property: 'relation',
                                type: 'equals' as const,
                                value: 'Salarié'
                            }
                        ],
                        actions: [
                            {
                                type: 'UpdateClassAction' as const,
                                newClass: 'Salarié'
                            }
                        ]
                    }
                ]
            };

            mockVault.getDynamicClassFactory().getClassConfig.mockResolvedValue(classConfig);

            await processManager.runProcesses('Personne', mockInstance, 'onPropertyChange', 'relation');

            expect(mockFile.updateMetadata).not.toHaveBeenCalled();
        });

        it('should use onUpdate as default trigger', async () => {
            const mockProperty = {
                name: 'relation',
                read: jest.fn().mockResolvedValue('Salarié')
            } as any;
            mockInstance.addProperty(mockProperty);

            const classConfig = {
                className: 'Personne',
                classIcon: '👤',
                properties: {},
                process: [
                    {
                        name: 'ClassChangeProcess',
                        // No triggers specified, should default to ['onUpdate']
                        conditions: [
                            {
                                property: 'relation',
                                type: 'equals' as const,
                                value: 'Salarié'
                            }
                        ],
                        actions: [
                            {
                                type: 'UpdateClassAction' as const,
                                newClass: 'Salarié'
                            }
                        ]
                    }
                ]
            };

            mockVault.getDynamicClassFactory().getClassConfig.mockResolvedValue(classConfig);

            await processManager.runProcesses('Personne', mockInstance, 'onUpdate');

            expect(mockVault.app.updateMetadata).toHaveBeenCalledWith(mockFile, { 'Classe': 'Salarié' });
        });

        it('should update display after UpdateClassAction', async () => {
            const mockProperty = {
                name: 'relation',
                read: jest.fn().mockResolvedValue('Salarié'),
                getDisplay: jest.fn().mockImplementation(() => {
                    const div = document.createElement('div');
                    div.className = 'property-display';
                    div.textContent = 'relation: Salarié';
                    return Promise.resolve(div);
                })
            } as any;
            mockInstance.addProperty(mockProperty);

            // Initial state: Personne class
            mockInstance.name = 'Personne';
            mockInstance.icon = '👤';
            (mockFile.getClassePropertyValue as jest.Mock).mockResolvedValue('Personne');

            const classConfig = {
                className: 'Personne',
                classIcon: '👤',
                properties: {},
                process: [
                    {
                        name: 'ClassChangeProcess',
                        triggers: ['onPropertyChange' as const],
                        conditions: [
                            {
                                property: 'relation',
                                type: 'equals' as const,
                                value: 'Salarié'
                            }
                        ],
                        actions: [
                            {
                                type: 'UpdateClassAction' as const,
                                newClass: 'Salarié'
                            }
                        ]
                    }
                ]
            };

            mockVault.getDynamicClassFactory().getClassConfig.mockResolvedValue(classConfig);

            // Get initial display
            const initialDisplay = await mockInstance.getDisplay();
            expect(initialDisplay.querySelector('.classe-header')?.textContent).toBe('Personne');

            // Execute the process that changes the class
            await processManager.runProcesses('Personne', mockInstance, 'onPropertyChange', 'relation');

            // Update the instance to reflect the new class (simulating what would happen in real scenario)
            mockInstance.name = 'Salarié';
            mockInstance.icon = '💼';
            (mockFile.getClassePropertyValue as jest.Mock).mockResolvedValue('Salarié');

            // Get display after class change
            const updatedDisplay = await mockInstance.getDisplay();
            expect(updatedDisplay.querySelector('.classe-header')?.textContent).toBe('Salarié');
            expect(mockVault.app.updateMetadata).toHaveBeenCalledWith(mockFile, { 'Classe': 'Salarié' });
            expect(mockVault.app.needDisplayRefresh).toHaveBeenCalled();
        });

        it('should update Vault cache after UpdateClassAction', async () => {
            const mockProperty = {
                name: 'relation',
                read: jest.fn().mockResolvedValue('Salarié'),
                getDisplay: jest.fn().mockImplementation(() => {
                    const div = document.createElement('div');
                    div.className = 'property-display';
                    div.textContent = 'relation: Salarié';
                    return Promise.resolve(div);
                })
            } as any;
            mockInstance.addProperty(mockProperty);

            // Set up initial cache state
            const filePath = 'test/path.md';
            mockFile.path = filePath;
            mockVault.files = { [filePath]: mockInstance };

            // Initial state: Personne class
            mockInstance.name = 'Personne';
            (mockFile.getClassePropertyValue as jest.Mock).mockResolvedValue('Personne');

            const classConfig = {
                className: 'Personne',
                classIcon: '👤',
                properties: {},
                process: [
                    {
                        name: 'ClassChangeProcess',
                        triggers: ['onPropertyChange' as const],
                        conditions: [
                            {
                                property: 'relation',
                                type: 'equals' as const,
                                value: 'Salarié'
                            }
                        ],
                        actions: [
                            {
                                type: 'UpdateClassAction' as const,
                                newClass: 'Salarié'
                            }
                        ]
                    }
                ]
            };

            // Mock the new class constructor
            const SalarieConstructor = class extends Classe {
                constructor(vault: any, file: any) {
                    super(vault, file);
                    this.name = 'Salarié';
                    this.icon = '💼';
                }
            };
            
            mockVault.getDynamicClassFactory().getClassConfig.mockResolvedValue(classConfig);
            mockVault.getDynamicClassFactory().getClass = jest.fn().mockResolvedValue(SalarieConstructor);

            // Execute the process that changes the class
            await processManager.runProcesses('Personne', mockInstance, 'onPropertyChange', 'relation');

            // Verify metadata was updated
            expect(mockVault.app.updateMetadata).toHaveBeenCalledWith(mockFile, { 'Classe': 'Salarié' });

            // Verify that the vault cache should be updated
            // The cached instance should now be of the new class type
            const cachedInstance = mockVault.files[filePath];
            expect(cachedInstance).toBeDefined();
            
            // After UpdateClassAction, the cache should contain a new instance of Salarié class
            // This is the bug: the cache still contains the old Personne instance
            expect(cachedInstance.name).toBe('Salarié');
        });
    });

    describe('ProcessManager - CreateFileAction', () => {
        it('should execute CreateFileAction when conditions are met', async () => {
            const mockProperty = {
                name: 'needsTask',
                read: jest.fn().mockResolvedValue(true)
            } as any;
            mockInstance.addProperty(mockProperty);

            const mockClassConstructor = jest.fn();
            mockVault.getDynamicClassFactory().getClass.mockResolvedValue(mockClassConstructor);

            const mockNewFile = {
                path: 'tasks/new-task.md'
            };
            mockVault.createFile.mockResolvedValue(mockNewFile);

            const classConfig = {
                className: 'Personne',
                classIcon: '👤',
                properties: {},
                process: [
                    {
                        name: 'CreateTaskProcess',
                        triggers: ['onCreate' as const],
                        conditions: [
                            {
                                property: 'needsTask',
                                type: 'equals' as const,
                                value: true
                            }
                        ],
                        actions: [
                            {
                                type: 'CreateFileAction' as const,
                                className: 'Tache',
                                name: 'Nouvelle tâche'
                            }
                        ]
                    }
                ]
            };

            mockVault.getDynamicClassFactory().getClassConfig.mockResolvedValue(classConfig);

            await processManager.runProcesses('Personne', mockInstance, 'onCreate');

            expect(mockVault.getDynamicClassFactory().getClass).toHaveBeenCalledWith('Tache');
            expect(mockVault.createFile).toHaveBeenCalledWith(
                mockClassConstructor,
                'Nouvelle tâche',
                expect.any(Object)
            );
        });
    });
});
