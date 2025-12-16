import { ClassConfigManager } from '../../src/Config/ClassConfigManager';
import { Vault } from '../../src/vault/Vault';
import { IFile } from '../../src/interfaces/IApp';
import * as fs from 'fs';
import * as path from 'path';

describe('ClassConfigManager - Class Extension (extend)', () => {
    let mockApp: any;
    let mockVault: jest.Mocked<Vault>;
    let configManager: ClassConfigManager;
    let tempConfigDir: string;

    beforeEach(async () => {
        // Create temporary config directory for testing
        tempConfigDir = path.join(__dirname, 'temp-extend-config-' + Date.now());
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

    describe('Basic class extension', () => {
        it('should inherit properties from parent class', async () => {
            // Create parent class config
            const parentConfig = `name: Personne
icon: 👤
properties:
  nom:
    type: TextProperty
    title: Nom
  prenom:
    type: TextProperty
    title: Prénom
  email:
    type: EmailProperty
    title: Email
`;
            fs.writeFileSync(path.join(tempConfigDir, 'Personne.yaml'), parentConfig);

            // Create child class config that extends parent
            const childConfig = `name: Salarié
icon: 💼
extend: Personne
properties:
  dateEntree:
    type: DateProperty
    title: Date d'entrée
  statut:
    type: SelectProperty
    title: Statut
    options: ["Actif", "Inactif"]
`;
            fs.writeFileSync(path.join(tempConfigDir, 'Salarié.yaml'), childConfig);

            // Load the child class
            const SalarieClass = await configManager.createDynamicClasse('Salarié');

            // Verify it has both inherited and own properties
            const properties = Object.keys(SalarieClass.getStaticProperties());
            
            // Should have parent properties
            expect(properties).toContain('nom');
            expect(properties).toContain('prenom');
            expect(properties).toContain('email');
            
            // Should have child properties
            expect(properties).toContain('dateEntree');
            expect(properties).toContain('statut');
            
            // Total should be 5 properties + 1 (Classe property auto-added)
            expect(properties.length).toBe(6);
        });

        it('should allow child class to override parent properties', async () => {
            // Create parent class
            const parentConfig = `name: BaseClass
icon: 📄
properties:
  name:
    type: TextProperty
    title: Name
    defaultValue: "Default"
  age:
    type: NumberProperty
    title: Age
`;
            fs.writeFileSync(path.join(tempConfigDir, 'BaseClass.yaml'), parentConfig);

            // Create child class that overrides name property
            const childConfig = `name: ExtendedClass
icon: 📋
extend: BaseClass
properties:
  name:
    type: TextProperty
    title: Custom Name
    defaultValue: "Custom Default"
  email:
    type: EmailProperty
    title: Email
`;
            fs.writeFileSync(path.join(tempConfigDir, 'ExtendedClass.yaml'), childConfig);

            const ExtendedClass = await configManager.createDynamicClasse('ExtendedClass');

            // Should have 3 properties (name overridden, age inherited, email new)
            const properties = Object.keys(ExtendedClass.getStaticProperties());
            expect(properties).toContain('name');
            expect(properties).toContain('age');
            expect(properties).toContain('email');
            expect(properties.length).toBe(4);
            
            // The name property should have the child's configuration
            const nameProperty = ExtendedClass.getStaticProperties()['name'];
            expect(nameProperty.title).toBe('Custom Name');
        });

        it('should inherit parent configuration (autoRename, populate, etc)', async () => {
            // Create parent with autoRename
            const parentConfig = `name: ParentWithRename
icon: 📁
autoRename: "{date} - {name}"
parent:
  property: institution
  folder: People
properties:
  date:
    type: DateProperty
    title: Date
  name:
    type: TextProperty
    title: Name
`;
            fs.writeFileSync(path.join(tempConfigDir, 'ParentWithRename.yaml'), parentConfig);

            // Create child without specifying autoRename or parent
            const childConfig = `name: ChildClass
icon: 📂
extend: ParentWithRename
properties:
  extra:
    type: TextProperty
    title: Extra
`;
            fs.writeFileSync(path.join(tempConfigDir, 'ChildClass.yaml'), childConfig);

            const ChildClass = await configManager.createDynamicClasse('ChildClass');
            
            // Should inherit parent configuration
            expect(ChildClass.parentPropertyName).toBe("institution");
            expect(ChildClass.parentFolderName).toBe("People");
        });
    });

    describe('Multi-level inheritance', () => {
        it('should support inheritance chain (grandparent -> parent -> child)', async () => {
            // Grandparent class
            const grandparentConfig = `name: Entity
icon: 🔷
properties:
  id:
    type: IdProperty
    title: ID
  name:
    type: TextProperty
    title: Name
`;
            fs.writeFileSync(path.join(tempConfigDir, 'Entity.yaml'), grandparentConfig);

            // Parent class extends grandparent
            const parentConfig = `name: Person
icon: 👤
extend: Entity
properties:
  email:
    type: EmailProperty
    title: Email
  phone:
    type: PhoneProperty
    title: Phone
`;
            fs.writeFileSync(path.join(tempConfigDir, 'Person.yaml'), parentConfig);

            // Child class extends parent
            const childConfig = `name: Employee
icon: 💼
extend: Person
properties:
  salary:
    type: NumberProperty
    title: Salary
  department:
    type: TextProperty
    title: Department
`;
            fs.writeFileSync(path.join(tempConfigDir, 'Employee.yaml'), childConfig);

            const EmployeeClass = await configManager.createDynamicClasse('Employee');

            // Should have all properties from the chain
            const properties = Object.keys(EmployeeClass.getStaticProperties());
            
            // Grandparent properties
            expect(properties).toContain('id');
            expect(properties).toContain('name');
            
            // Parent properties
            expect(properties).toContain('email');
            expect(properties).toContain('phone');
            
            // Child properties
            expect(properties).toContain('salary');
            expect(properties).toContain('department');

            // Total should be 6 properties + 1 (Classe property auto-added)
            expect(properties.length).toBe(7);
        });
    });

    describe('Edge cases', () => {
        it('should work when child has no additional properties', async () => {
            // Parent class
            const parentConfig = `name: BaseEntity
icon: 📄
properties:
  name:
    type: TextProperty
    title: Name
`;
            fs.writeFileSync(path.join(tempConfigDir, 'BaseEntity.yaml'), parentConfig);

            // Child class with no properties section (just extends)
            const childConfig = `name: SpecialEntity
icon: ⭐
extend: BaseEntity
`;
            fs.writeFileSync(path.join(tempConfigDir, 'SpecialEntity.yaml'), childConfig);

            const SpecialClass = await configManager.createDynamicClasse('SpecialEntity');

            // Should still have parent property
            const properties = Object.keys(SpecialClass.getStaticProperties());
            expect(properties).toContain('name');
            expect(properties.length).toBe(2);
        });

        it('should throw error if extended class does not exist', async () => {
            // Child class extends non-existent parent
            const childConfig = `name: OrphanChild
icon: 🚫
extend: NonExistentParent
properties:
  test:
    type: TextProperty
    title: Test
`;
            fs.writeFileSync(path.join(tempConfigDir, 'OrphanChild.yaml'), childConfig);

            await expect(configManager.createDynamicClasse('OrphanChild')).rejects.toThrow();
        });

        it('should allow child to override parent autoRename', async () => {
            // Parent with autoRename
            const parentConfig = `name: ParentClass
icon: 📁
autoRename: "{id} - {name}"
properties:
  id:
    type: IdProperty
    title: ID
  name:
    type: TextProperty
    title: Name
`;
            fs.writeFileSync(path.join(tempConfigDir, 'ParentClass.yaml'), parentConfig);

            // Child overrides autoRename
            const childConfig = `name: ChildOverride
icon: 📂
extend: ParentClass
autoRename: "{name} - Custom"
properties:
  extra:
    type: TextProperty
    title: Extra
`;
            fs.writeFileSync(path.join(tempConfigDir, 'ChildOverride.yaml'), childConfig);

            const ChildClass = await configManager.createDynamicClasse('ChildOverride');

            // Child class created successfully
            expect(ChildClass).toBeDefined();
        });
    });
});
