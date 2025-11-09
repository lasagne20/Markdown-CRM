import { IApp, IFile } from '../src/interfaces/IApp';

export interface MockApp extends IApp {
    vault: {
        getAbstractFileByPath: jest.MockedFunction<any>;
        getFiles: jest.MockedFunction<any>;
        createFolder: jest.MockedFunction<any>;
    };
    getFile: jest.MockedFunction<any>;
    readFile: jest.MockedFunction<any>;
    writeFile: jest.MockedFunction<any>;
    renameFile: jest.MockedFunction<any>;
    getMetadata: jest.MockedFunction<any>;
    updateMetadata: jest.MockedFunction<any>;
    waitForFileMetaDataUpdate: jest.MockedFunction<any>;
    getTemplateContent: jest.MockedFunction<any>;
    createDiv: jest.MockedFunction<any>;
    createFolder: jest.MockedFunction<any>;
    setIcon: jest.MockedFunction<any>;
}

export function mockApp(): MockApp {
    return {
        vault: {
            getAbstractFileByPath: jest.fn(),
            getFiles: jest.fn(() => []),
            createFolder: jest.fn()
        },
        getFile: jest.fn(),
        readFile: jest.fn(),
        writeFile: jest.fn(),
        renameFile: jest.fn(),
        getMetadata: jest.fn(),
        updateMetadata: jest.fn(),
        waitForFileMetaDataUpdate: jest.fn(),
        getTemplateContent: jest.fn(),
        createDiv: jest.fn(),
        createFolder: jest.fn(),
        setIcon: jest.fn()
    };
}