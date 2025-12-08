import { ClassConfigManager } from '../../src/Config/ClassConfigManager';
import { Vault } from '../../src/vault/Vault';
import { File } from '../../src/vault/File';
import { IFile } from '../../src/interfaces/IApp';
import * as fs from 'fs';
import * as path from 'path';

describe('ClassConfigManager - AutoRename Configuration', () => {
    let mockApp: any;
    let mockVault: jest.Mocked<Vault>;
    let configManager: ClassConfigManager;
    let tempConfigDir: string;

    beforeEach(async () => {
        // Create temporary config directory for testing
        tempConfigDir = path.join(__dirname, 'temp-config-' + Date.now());
        if (!fs.existsSync(tempConfigDir)) {
            fs.mkdirSync(tempConfigDir, { recursive: true });
        }

        mockApp = {
            getSettings: jest.fn().mockReturnValue({ classePropertyName: 'Classe' }),
            createDiv: jest.fn(() => document.createElement('div')),
            setIcon: jest.fn(),
            getMetadata: jest.fn(),
            updateMetadata: jest.fn(),
            move: jest.fn(),
            getFile: jest.fn((filePath: string) => {
                // Support reading files from tempConfigDir
                const fileName = path.basename(filePath);
                const fullPath = path.join(tempConfigDir, fileName);
                if (fs.existsSync(fullPath)) {
                    return {
                        path: filePath,
                        name: fileName,
                        basename: path.basename(fileName, '.yaml'),
                        extension: 'yaml',
                    } as IFile;
                }
                return null;
            }),
            readFile: jest.fn((file: IFile) => {
                // Read from tempConfigDir
                const fullPath = path.join(tempConfigDir, file.name);
                if (fs.existsSync(fullPath)) {
                    return Promise.resolve(fs.readFileSync(fullPath, 'utf-8'));
                }
                return Promise.reject(new Error('File not found'));
            }),
        };

        mockVault = {
            app: mockApp,
        } as any;

        configManager = new ClassConfigManager(tempConfigDir, mockVault);
    });

    afterEach(() => {
        // Clean up temp config directory
        if (fs.existsSync(tempConfigDir)) {
            fs.rmSync(tempConfigDir, { recursive: true, force: true });
        }
    });

    describe('Loading autoRename from YAML', () => {
        it('should load autoRename template from class configuration', async () => {
            // Create a test YAML config file
            const configContent = `name: TestClass
icon: 🧪
autoRename: "{dateEntree} - {nom}"
properties:
  dateEntree:
    type: DateProperty
    title: Date d'entrée
  nom:
    type: TextProperty
    title: Nom
`;
            const configPath = path.join(tempConfigDir, 'TestClass.yaml');
            fs.writeFileSync(configPath, configContent);

            // Load the class
            const TestClass = await configManager.createDynamicClasse('TestClass');

            // Verify autoRename is loaded
            expect(TestClass.autoRename).toBe("{dateEntree} - {nom}");
        });

        it('should handle class without autoRename configuration', async () => {
            const configContent = `name: SimpleClass
icon: 📝
properties:
  nom:
    type: TextProperty
    title: Nom
`;
            const configPath = path.join(tempConfigDir, 'SimpleClass.yaml');
            fs.writeFileSync(configPath, configContent);

            const SimpleClass = await configManager.createDynamicClasse('SimpleClass');

            expect(SimpleClass.autoRename).toBeUndefined();
        });

        it('should load complex autoRename template with current placeholder', async () => {
            const configContent = `name: Person
icon: 👤
autoRename: "{dateEntree} - {current}"
properties:
  dateEntree:
    type: DateProperty
    title: Date
`;
            const configPath = path.join(tempConfigDir, 'Person.yaml');
            fs.writeFileSync(configPath, configContent);

            const PersonClass = await configManager.createDynamicClasse('Person');

            expect(PersonClass.autoRename).toBe("{dateEntree} - {current}");
        });

        it('should load autoRename with nested property placeholders', async () => {
            const configContent = `name: Employee
icon: 💼
autoRename: "{postes.poste} - {nom}"
properties:
  nom:
    type: TextProperty
    title: Nom
  postes:
    type: ObjectProperty
    title: Postes
    properties:
      poste:
        type: TextProperty
        title: Poste
      institution:
        type: FileProperty
        title: Institution
`;
            const configPath = path.join(tempConfigDir, 'Employee.yaml');
            fs.writeFileSync(configPath, configContent);

            const EmployeeClass = await configManager.createDynamicClasse('Employee');

            expect(EmployeeClass.autoRename).toBe("{postes.poste} - {nom}");
        });
    });

    describe('Integration with dynamic class instances', () => {
        it('should apply autoRename to class instances', async () => {
            const configContent = `name: Task
icon: ✅
autoRename: "{priority} - {title}"
properties:
  priority:
    type: TextProperty
    title: Priority
  title:
    type: TextProperty
    title: Title
`;
            const configPath = path.join(tempConfigDir, 'Task.yaml');
            fs.writeFileSync(configPath, configContent);

            const TaskClass = await configManager.createDynamicClasse('Task');
            
            const mockFile: IFile = {
                path: 'vault/Tasks/OldName.md',
                name: 'OldName.md',
                basename: 'OldName',
                extension: 'md',
            };
            
            const instance = new TaskClass(mockVault, new File(mockVault, mockFile));

            // Verify the instance has access to autoRename via constructor
            expect((instance.constructor as typeof TaskClass).autoRename).toBe("{priority} - {title}");
        });

        it('should handle empty autoRename string', async () => {
            const configContent = `name: EmptyRename
icon: 📭
autoRename: ""
properties:
  nom:
    type: TextProperty
    title: Nom
`;
            const configPath = path.join(tempConfigDir, 'EmptyRename.yaml');
            fs.writeFileSync(configPath, configContent);

            const EmptyClass = await configManager.createDynamicClasse('EmptyRename');

            // Empty string is treated as "not configured"
            expect(EmptyClass.autoRename).toBeUndefined();
        });
    });

    describe('AutoRename with parent configuration', () => {
        it('should load both autoRename and parent configuration', async () => {
            const configContent = `name: ChildClass
icon: 👶
autoRename: "{date} - {name}"
parent:
  property: parent
  folder: Children
properties:
  date:
    type: DateProperty
    title: Date
  name:
    type: TextProperty
    title: Name
  parent:
    type: FileProperty
    title: Parent
    classes:
      - ParentClass
`;
            const configPath = path.join(tempConfigDir, 'ChildClass.yaml');
            fs.writeFileSync(configPath, configContent);

            const ChildClass = await configManager.createDynamicClasse('ChildClass');

            expect(ChildClass.autoRename).toBe("{date} - {name}");
            expect(ChildClass.parentPropertyName).toBe("parent");
            expect(ChildClass.parentFolderName).toBe("Children");
        });

        it('should load autoRename with multiple parent properties', async () => {
            const configContent = `name: MultiParentClass
icon: 🌳
autoRename: "{code} - {title}"
parents:
  - property: primaryParent
    folder: Items
  - property: secondaryParent
    folder: Backup
properties:
  code:
    type: TextProperty
    title: Code
  title:
    type: TextProperty
    title: Title
  primaryParent:
    type: FileProperty
    title: Primary Parent
  secondaryParent:
    type: FileProperty
    title: Secondary Parent
`;
            const configPath = path.join(tempConfigDir, 'MultiParentClass.yaml');
            fs.writeFileSync(configPath, configContent);

            const MultiClass = await configManager.createDynamicClasse('MultiParentClass');

            expect(MultiClass.autoRename).toBe("{code} - {title}");
            expect(MultiClass.parentPropertyNames).toEqual(["primaryParent", "secondaryParent"]);
            expect(MultiClass.parentFolderName).toBe("Items");
        });
    });

    describe('Special characters in autoRename template', () => {
        it('should handle templates with special characters', async () => {
            const configContent = `name: SpecialClass
icon: 🎨
autoRename: "{year}/{month} - {title}"
properties:
  year:
    type: NumberProperty
    title: Year
  month:
    type: TextProperty
    title: Month
  title:
    type: TextProperty
    title: Title
`;
            const configPath = path.join(tempConfigDir, 'SpecialClass.yaml');
            fs.writeFileSync(configPath, configContent);

            const SpecialClass = await configManager.createDynamicClasse('SpecialClass');

            // The template should be loaded as-is
            expect(SpecialClass.autoRename).toBe("{year}/{month} - {title}");
        });

        it('should handle templates with multiple placeholders of same property', async () => {
            const configContent = `name: DuplicateClass
icon: 🔁
autoRename: "{name} ({name})"
properties:
  name:
    type: TextProperty
    title: Name
`;
            const configPath = path.join(tempConfigDir, 'DuplicateClass.yaml');
            fs.writeFileSync(configPath, configContent);

            const DuplicateClass = await configManager.createDynamicClasse('DuplicateClass');

            expect(DuplicateClass.autoRename).toBe("{name} ({name})");
        });
    });
});
