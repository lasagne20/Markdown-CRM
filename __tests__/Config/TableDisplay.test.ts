import { ConfigLoader } from '../../src/Config/ConfigLoader';
import { Vault } from '../../src/vault/Vault';
import { ClassConfig } from '../../src/Config/interfaces';

describe('Table Display Configuration', () => {
    let configLoader: ConfigLoader;
    let vault: Vault;

    beforeEach(() => {
        // Mock Vault and App
        const mockApp = {
            getFile: jest.fn(),
            readFile: jest.fn(),
            createFolder: jest.fn(),
        };

        vault = {
            app: mockApp,
            rootPath: '__tests__/Config/test-configs',
        } as any;

        configLoader = new ConfigLoader('__tests__/Config/test-configs', vault);
    });

    describe('Table Container Parsing', () => {
        it('should parse table container configuration', async () => {
            const yamlContent = `
className: TestClass
classIcon: 📊

properties:
  name:
    type: NameProperty
    name: name

display:
  containers:
    - type: table
      title: "Test Table"
      source:
        class: TestClass
        filter: children
      columns:
        - name: "Name"
          propertyName: name
          filter: text
          sort: true
`;

            // Mock file reading with extension property
            vault.app.getFile = jest.fn().mockResolvedValue({ 
                path: 'TestClass.yaml',
                extension: 'yaml',
                name: 'TestClass.yaml'
            });
            vault.app.readFile = jest.fn().mockResolvedValue(yamlContent);

            const config = await configLoader.loadClassConfig('TestClass');

            expect(config.display).toBeDefined();
            expect(config.display?.containers).toHaveLength(1);
            
            const tableContainer = config.display?.containers?.[0];
            expect(tableContainer?.type).toBe('table');
            expect(tableContainer?.title).toBe('Test Table');
            expect(tableContainer?.source).toBeDefined();
            expect(tableContainer?.source?.class).toBe('TestClass');
            expect(tableContainer?.source?.filter).toBe('children');
            expect(tableContainer?.columns).toHaveLength(1);
            expect(tableContainer?.columns?.[0].name).toBe('Name');
            expect(tableContainer?.columns?.[0].propertyName).toBe('name');
            expect(tableContainer?.columns?.[0].filter).toBe('text');
            expect(tableContainer?.columns?.[0].sort).toBe(true);
        });

        it('should parse table with multiple columns', async () => {
            const yamlContent = `
className: Contact
classIcon: 👤

properties:
  name:
    type: NameProperty
    name: name
  email:
    type: EmailProperty
    name: email
  phone:
    type: PhoneProperty
    name: phone

display:
  containers:
    - type: table
      source:
        class: Contact
        filter: all
      columns:
        - name: "Email"
          propertyName: email
          filter: text
        - name: "Phone"
          propertyName: phone
          filter: false
          sort: true
`;

            vault.app.getFile = jest.fn().mockResolvedValue({ 
                path: 'Contact.yaml',
                extension: 'yaml',
                name: 'Contact.yaml'
            });
            vault.app.readFile = jest.fn().mockResolvedValue(yamlContent);

            const config = await configLoader.loadClassConfig('Contact');

            const tableContainer = config.display?.containers?.[0];
            expect(tableContainer?.columns).toHaveLength(2);
            expect(tableContainer?.columns?.[0].name).toBe('Email');
            expect(tableContainer?.columns?.[1].name).toBe('Phone');
            expect(tableContainer?.columns?.[1].filter).toBe(false);
        });

        it('should parse table with totals configuration', async () => {
            const yamlContent = `
className: Project
classIcon: 📊

properties:
  name:
    type: NameProperty
    name: name
  budget:
    type: NumberProperty
    name: budget

display:
  containers:
    - type: table
      source:
        class: Project
        filter: all
      columns:
        - name: "Budget"
          propertyName: budget
      totals:
        - column: "Budget"
          formula: sum
        - column: "Projects"
          formula: count
`;

            vault.app.getFile = jest.fn().mockResolvedValue({ 
                path: 'Project.yaml',
                extension: 'yaml',
                name: 'Project.yaml'
            });
            vault.app.readFile = jest.fn().mockResolvedValue(yamlContent);

            const config = await configLoader.loadClassConfig('Project');

            const tableContainer = config.display?.containers?.[0];
            expect(tableContainer?.totals).toHaveLength(2);
            expect(tableContainer?.totals?.[0].column).toBe('Budget');
            expect(tableContainer?.totals?.[0].formula).toBe('sum');
            expect(tableContainer?.totals?.[1].column).toBe('Projects');
            expect(tableContainer?.totals?.[1].formula).toBe('count');
        });

        it('should support different filter types', async () => {
            const yamlContent = `
className: TestClass
classIcon: 📊

properties:
  name:
    type: NameProperty
    name: name

display:
  containers:
    - type: table
      source:
        class: TestClass
        filter: children
      columns:
        - name: "Text Filter"
          propertyName: field1
          filter: text
        - name: "Select Filter"
          propertyName: field2
          filter: select
        - name: "Multi-Select Filter"
          propertyName: field3
          filter: multi-select
        - name: "No Filter"
          propertyName: field4
          filter: false
`;

            vault.app.getFile = jest.fn().mockResolvedValue({ 
                path: 'TestClass.yaml',
                extension: 'yaml',
                name: 'TestClass.yaml'
            });
            vault.app.readFile = jest.fn().mockResolvedValue(yamlContent);

            const config = await configLoader.loadClassConfig('TestClass');

            const tableContainer = config.display?.containers?.[0];
            expect(tableContainer?.columns?.[0].filter).toBe('text');
            expect(tableContainer?.columns?.[1].filter).toBe('select');
            expect(tableContainer?.columns?.[2].filter).toBe('multi-select');
            expect(tableContainer?.columns?.[3].filter).toBe(false);
        });

        it('should support different source filter types', async () => {
            const filters = ['all', 'children', 'parent', 'siblings', 'roots'];

            for (const filter of filters) {
                // Create new ConfigLoader for each test to avoid caching
                const mockApp = {
                    getFile: jest.fn(),
                    readFile: jest.fn(),
                    createFolder: jest.fn(),
                };

                const testVault = {
                    app: mockApp,
                    rootPath: '__tests__/Config/test-configs',
                } as any;

                const testConfigLoader = new ConfigLoader('__tests__/Config/test-configs', testVault);

                const yamlContent = `
className: TestClass
classIcon: 📊

properties:
  name:
    type: NameProperty
    name: name

display:
  containers:
    - type: table
      source:
        class: TestClass
        filter: ${filter}
      columns:
        - name: "Name"
          propertyName: name
`;

                testVault.app.getFile = jest.fn().mockResolvedValue({ 
                    path: 'TestClass.yaml',
                    extension: 'yaml',
                    name: 'TestClass.yaml'
                });
                testVault.app.readFile = jest.fn().mockResolvedValue(yamlContent);

                const config = await testConfigLoader.loadClassConfig('TestClass');

                const tableContainer = config.display?.containers?.[0];
                expect(tableContainer?.source?.filter).toBe(filter);
            }
        });

        it('should handle mixed container types', async () => {
            const yamlContent = `
className: Mixed
classIcon: 📊

properties:
  name:
    type: NameProperty
    name: name
  description:
    type: TextProperty
    name: description

display:
  containers:
    - type: line
      properties:
        - name
    - type: table
      source:
        class: Child
        filter: children
      columns:
        - name: "Name"
          propertyName: name
    - type: fold
      foldTitle: "More info"
      properties:
        - description
`;

            vault.app.getFile = jest.fn().mockResolvedValue({ 
                path: 'Mixed.yaml',
                extension: 'yaml',
                name: 'Mixed.yaml'
            });
            vault.app.readFile = jest.fn().mockResolvedValue(yamlContent);

            const config = await configLoader.loadClassConfig('Mixed');

            expect(config.display?.containers).toHaveLength(3);
            expect(config.display?.containers?.[0].type).toBe('line');
            expect(config.display?.containers?.[1].type).toBe('table');
            expect(config.display?.containers?.[2].type).toBe('fold');
        });
    });
});
