import { IApp, IFile, ISettings } from '../../src/interfaces/IApp';

export interface MockApp extends IApp {
    vault: {
        getAbstractFileByPath: jest.MockedFunction<any>;
        getFiles: jest.MockedFunction<any>;
        createFolder: jest.MockedFunction<any>;
    };
    getFile: jest.MockedFunction<any>;
    readFile: jest.MockedFunction<any>;
    writeFile: jest.MockedFunction<any>;
    move: jest.MockedFunction<any>;
    getMetadata: jest.MockedFunction<any>;
    updateMetadata: jest.MockedFunction<any>;
    waitForFileMetaDataUpdate: jest.MockedFunction<any>;
    getTemplateContent: jest.MockedFunction<any>;
    createDiv: jest.MockedFunction<any>;
    createFolder: jest.MockedFunction<any>;
    setIcon: jest.MockedFunction<any>;
    sendNotice: jest.MockedFunction<any>;
    getSettings: jest.MockedFunction<any>;
}

export function mockApp(settings?: Partial<ISettings>): MockApp {
    const defaultSettings: ISettings = {
        phoneFormat: 'FR',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        timezone: 'Europe/Paris',
        numberLocale: 'fr-FR',
        currencySymbol: '€',
        ...settings
    };
    
    return {
        vault: {
            getAbstractFileByPath: jest.fn(),
            getFiles: jest.fn(() => []),
            createFolder: jest.fn()
        },
        getFile: jest.fn(),
        readFile: jest.fn(),
        writeFile: jest.fn(),
        move: jest.fn(),
        getMetadata: jest.fn(),
        updateMetadata: jest.fn(),
        waitForFileMetaDataUpdate: jest.fn(),
        getTemplateContent: jest.fn(),
        createDiv: jest.fn(() => document.createElement('div')),
        createFolder: jest.fn(),
        setIcon: jest.fn((element: HTMLElement, iconName: string) => {
            element.setAttribute('data-icon', iconName);
            element.textContent = `[${iconName}]`;
        }),
        sendNotice: jest.fn(),
        getSettings: jest.fn(() => defaultSettings),
        
        // Implement missing IApp methods with jest mocks
        createFile: jest.fn(),
        delete: jest.fn(),
        listFiles: jest.fn(() => Promise.resolve([])),
        listFolders: jest.fn(() => Promise.resolve([])),
        getAbsolutePath: jest.fn((path: string) => `/vault/${path}`),
        getName: jest.fn(() => 'Test Vault'),
        isFolder: jest.fn(() => false),
        isFile: jest.fn(() => true),
        getUrl: jest.fn((path: string) => `vault://${path}`),
        createButton: jest.fn(() => document.createElement('button')),
        createInput: jest.fn(() => document.createElement('input')),
        getSetting: jest.fn(),
        setSetting: jest.fn(),
        getVaultPath: jest.fn(() => '/vault'),
        open: jest.fn(),
        waitForMetaDataCacheUpdate: jest.fn(),
        selectMedia: jest.fn(),
        selectMultipleFile: jest.fn(),
        selectFile: jest.fn(),
        selectClasse: jest.fn(),
        selectFromList: jest.fn()
    } as any;
}