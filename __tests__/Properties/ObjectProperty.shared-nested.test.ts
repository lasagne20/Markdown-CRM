import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { TextProperty } from '../../src/properties/TextProperty';
import { mockApp } from '../test-utils';
import { Vault } from '../../src/vault/Vault';

describe('ObjectProperty - Shared Nested Properties Bug', () => {
    let vault: Vault;

    beforeEach(() => {
        vault = new Vault(mockApp);
    });

    test('different objects should not share nested ObjectProperty instances', () => {
        // Create nested structure: Company -> contacts (ObjectProperty) -> name, role
        const contactProperties = {
            name: new TextProperty('name', vault),
            role: new TextProperty('role', vault)
        };

        const contactsProperty = new ObjectProperty('contacts', vault, contactProperties);

        // Simulate two companies with different contacts
        const company1Contacts = [
            { name: 'Alice', role: 'CEO' },
            { name: 'Bob', role: 'CTO' }
        ];

        const company2Contacts = [
            { name: 'Charlie', role: 'CFO' },
            { name: 'Diana', role: 'COO' }
        ];

        // Display company 1 contacts
        const update1 = jest.fn();
        const display1 = contactsProperty.fillDisplay(company1Contacts, update1);
        
        // Get the displayed content for company 1
        const company1Text = display1.textContent;
        expect(company1Text).toContain('Alice');
        expect(company1Text).toContain('CEO');
        expect(company1Text).toContain('Bob');
        expect(company1Text).toContain('CTO');

        // Now display company 2 contacts (this should be independent)
        const update2 = jest.fn();
        const display2 = contactsProperty.fillDisplay(company2Contacts, update2);
        
        const company2Text = display2.textContent;
        expect(company2Text).toContain('Charlie');
        expect(company2Text).toContain('CFO');
        expect(company2Text).toContain('Diana');
        expect(company2Text).toContain('COO');

        // The bug: display2 might still show Alice/Bob instead of Charlie/Diana
        expect(company2Text).not.toContain('Alice');
        expect(company2Text).not.toContain('Bob');

        // Display company 1 again - should still show original data
        const display1Again = contactsProperty.fillDisplay(company1Contacts, update1);
        const company1TextAgain = display1Again.textContent;
        
        expect(company1TextAgain).toContain('Alice');
        expect(company1TextAgain).toContain('Bob');
        expect(company1TextAgain).not.toContain('Charlie');
        expect(company1TextAgain).not.toContain('Diana');
    });

    test('nested ObjectProperty in multiple parent objects should be independent', () => {
        // Even deeper nesting: Company -> departments (ObjectProperty) -> employees (ObjectProperty) -> name
        const employeeProperties = {
            name: new TextProperty('name', vault)
        };

        const employeesProperty = new ObjectProperty('employees', vault, employeeProperties);

        const departmentProperties = {
            name: new TextProperty('name', vault),
            employees: employeesProperty
        };

        const departmentsProperty = new ObjectProperty('departments', vault, departmentProperties);

        // Company 1 with tech department
        const company1Departments = [
            {
                name: 'Tech',
                employees: [
                    { name: 'Alice' },
                    { name: 'Bob' }
                ]
            }
        ];

        // Company 2 with sales department
        const company2Departments = [
            {
                name: 'Sales',
                employees: [
                    { name: 'Charlie' },
                    { name: 'Diana' }
                ]
            }
        ];

        const update1 = jest.fn();
        const display1 = departmentsProperty.fillDisplay(company1Departments, update1);
        const company1Text = display1.textContent;

        const update2 = jest.fn();
        const display2 = departmentsProperty.fillDisplay(company2Departments, update2);
        const company2Text = display2.textContent;

        // Verify independent displays
        expect(company1Text).toContain('Tech');
        expect(company1Text).toContain('Alice');
        expect(company1Text).toContain('Bob');
        expect(company1Text).not.toContain('Sales');
        expect(company1Text).not.toContain('Charlie');

        expect(company2Text).toContain('Sales');
        expect(company2Text).toContain('Charlie');
        expect(company2Text).toContain('Diana');
        expect(company2Text).not.toContain('Tech');
        expect(company2Text).not.toContain('Alice');
    });
});
