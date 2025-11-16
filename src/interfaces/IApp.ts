export interface IFile {
    path: string;
    name: string;
    basename: string;
    extension: string;
    parent?: IFolder;
    children?: (IFile | IFolder)[];
}

export interface IFolder {
    path: string;
    name: string;
    parent?: IFolder;
    children?: (IFile | IFolder)[];
}

export interface ISettings {
    // Phone number formatting
    phoneFormat?: 'FR' | 'US' | 'INTL' | 'UK' | 'DE' | 'ES' | 'IT' | 'custom';
    phoneCustomFormat?: string; // Custom format pattern
    
    // Date/Time formatting
    dateFormat?: string;
    timeFormat?: '12h' | '24h';
    timezone?: string;
    
    // Number formatting
    numberLocale?: string;
    currencySymbol?: string;
    
    // Other settings can be added here
    [key: string]: any; // Allow custom settings
}


export interface IApp {
    // Settings
    getSettings(): ISettings;
    
    // File operations
    readFile(file: IFile): Promise<string>;
    writeFile(file: IFile, content: string): Promise<void>;
    createFile(path: string, content: string): Promise<IFile>;
    delete(file: IFile | IFolder): Promise<void>;
    move(fileOrFolder: IFile | IFolder, newPath: string): Promise<void>;
    
    // Folder operations
    createFolder(path: string): Promise<IFolder>;
    listFiles(folder?: IFolder): Promise<IFile[]>;
    listFolders(folder?: IFolder): Promise<IFolder[]>;
    getFile(path: string): Promise<IFile | IFolder | null>;
    getAbsolutePath(relativePath: string): string;

    getName(): string;
    isFolder(file : IFile): boolean;
    isFile(file : IFile): boolean;
    getUrl(path : string): string;
    
    // Metadata operations
    getMetadata(file: IFile): Promise<Record<string, any>>;
    updateMetadata(file: IFile, metadata: Record<string, any>): Promise<void>;
    
    // UI operations
    createButton(text: string, onClick: () => void): HTMLButtonElement;
    createInput(type: string, value?: string): HTMLInputElement;
    createDiv(className?: string): HTMLDivElement;
    setIcon(element: HTMLElement, iconName: string): void;
    
    // Template operations
    getTemplateContent(templateName: string): Promise<string>;
    
    // Settings
    getSetting(key: string): any;
    setSetting(key: string, value: any): Promise<void>;
    getVaultPath(): string;
    open(absoluteMediaPath: string): void;
    
    // Utility functions
    waitForFileMetaDataUpdate(filePath: string, key: string, callback: () => Promise<void>): Promise<void>;
    waitForMetaDataCacheUpdate(callback: () => Promise<void>): Promise<void>;

    // Utility to select files & media 
    selectMedia(vault: any, message: string): Promise<any>;
    selectMultipleFile(vault: any, classes: string[], options: any): Promise<any>;
    selectFile(vault: any, classes: string[], options: any): Promise<any>;
    selectClasse(vault: any, classes: string[], options: any): Promise<any>;
    selectFromList<T>(items: T[], options: {multiple: boolean, title?: string}): Promise<T | T[] | null>;

    sendNotice(message: string, timeout?: number): void;

}
