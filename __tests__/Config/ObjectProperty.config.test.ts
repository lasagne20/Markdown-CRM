import { ConfigLoader } from '../../src/Config/ConfigLoader';
import { ObjectProperty } from '../../src/properties/ObjectProperty';
import { Vault } from '../../src/vault/Vault';

describe('ObjectProperty - YAML Configuration', () => {
    let configLoader: ConfigLoader;
    let mockVault: any;

    beforeEach(() => {
        mockVault = {
            app: {
                vault: { getFiles: jest.fn(() => []) },
                setIcon: jest.fn(),
                getSettings: jest.fn(() => ({ phoneFormat: 'FR' }))
            }
        };
        configLoader = new ConfigLoader('config', mockVault);
    });

    describe('allowMove configuration from YAML', () => {
        it('should default allowMove to true when not specified', () => {
            const config = {
                type: 'ObjectProperty',
                properties: {
                    name: {
                        type: 'Property'
                    }
                }
            };

            (config as any).propertyKey = 'testProperty';
            const property = configLoader.createProperty(config) as ObjectProperty;

            expect(property).toBeInstanceOf(ObjectProperty);
            expect(property.allowMove).toBe(true);
        });

        it('should set allowMove to false when specified in YAML', () => {
            const config = {
                type: 'ObjectProperty',
                allowMove: false,
                properties: {
                    name: {
                        type: 'Property'
                    }
                }
            };

            (config as any).propertyKey = 'testProperty';
            const property = configLoader.createProperty(config) as ObjectProperty;

            expect(property).toBeInstanceOf(ObjectProperty);
            expect(property.allowMove).toBe(false);
        });

        it('should set allowMove to true when explicitly specified in YAML', () => {
            const config = {
                type: 'ObjectProperty',
                allowMove: true,
                properties: {
                    name: {
                        type: 'Property'
                    }
                }
            };

            (config as any).propertyKey = 'testProperty';
            const property = configLoader.createProperty(config) as ObjectProperty;

            expect(property).toBeInstanceOf(ObjectProperty);
            expect(property.allowMove).toBe(true);
        });
    });

    describe('appendFirst configuration from YAML', () => {
        it('should default appendFirst to false when not specified', () => {
            const config = {
                type: 'ObjectProperty',
                properties: {
                    name: {
                        type: 'Property'
                    }
                }
            };

            (config as any).propertyKey = 'testProperty';
            const property = configLoader.createProperty(config) as ObjectProperty;

            expect(property).toBeInstanceOf(ObjectProperty);
            expect(property.appendFirst).toBe(false);
        });

        it('should set appendFirst to true when specified in YAML', () => {
            const config = {
                type: 'ObjectProperty',
                appendFirst: true,
                properties: {
                    name: {
                        type: 'Property'
                    }
                }
            };

            (config as any).propertyKey = 'testProperty';
            const property = configLoader.createProperty(config) as ObjectProperty;

            expect(property).toBeInstanceOf(ObjectProperty);
            expect(property.appendFirst).toBe(true);
        });

        it('should set appendFirst to false when explicitly specified in YAML', () => {
            const config = {
                type: 'ObjectProperty',
                appendFirst: false,
                properties: {
                    name: {
                        type: 'Property'
                    }
                }
            };

            (config as any).propertyKey = 'testProperty';
            const property = configLoader.createProperty(config) as ObjectProperty;

            expect(property).toBeInstanceOf(ObjectProperty);
            expect(property.appendFirst).toBe(false);
        });
    });

    describe('Combined configuration from YAML', () => {
        it('should handle both allowMove and appendFirst together', () => {
            const config = {
                type: 'ObjectProperty',
                allowMove: false,
                appendFirst: true,
                properties: {
                    name: {
                        type: 'Property'
                    },
                    value: {
                        type: 'Property'
                    }
                }
            };

            (config as any).propertyKey = 'testProperty';
            const property = configLoader.createProperty(config) as ObjectProperty;

            expect(property).toBeInstanceOf(ObjectProperty);
            expect(property.allowMove).toBe(false);
            expect(property.appendFirst).toBe(true);
        });

        it('should handle allowMove, appendFirst and display together', () => {
            const config = {
                type: 'ObjectProperty',
                allowMove: false,
                appendFirst: true,
                display: 'table' as 'object' | 'table' | 'tabs',
                properties: {
                    name: {
                        type: 'Property'
                    },
                    value: {
                        type: 'Property'
                    }
                }
            };

            (config as any).propertyKey = 'testProperty';
            const property = configLoader.createProperty(config) as ObjectProperty;

            expect(property).toBeInstanceOf(ObjectProperty);
            expect(property.allowMove).toBe(false);
            expect(property.appendFirst).toBe(true);
            expect(property.display).toBe('table');
        });
    });

    describe('Real-world YAML configuration scenarios', () => {
        it('should parse a complete ObjectProperty configuration with all options', () => {
            const config = {
                type: 'ObjectProperty',
                title: 'Contact Information',
                tooltip: 'Enter contact details',
                allowMove: false,
                appendFirst: true,
                display: 'table' as 'object' | 'table' | 'tabs',
                properties: {
                    email: {
                        type: 'EmailProperty',
                        title: 'Email'
                    },
                    phone: {
                        type: 'PhoneProperty',
                        title: 'Phone'
                    }
                }
            };

            (config as any).propertyKey = 'contacts';
            const property = configLoader.createProperty(config) as ObjectProperty;

            expect(property).toBeInstanceOf(ObjectProperty);
            expect(property.name).toBe('contacts');
            expect(property.title).toBe('Contact Information');
            expect(property.tooltip).toBe('Enter contact details');
            expect(property.allowMove).toBe(false);
            expect(property.appendFirst).toBe(true);
            expect(property.display).toBe('table');
            expect(Object.keys(property.properties)).toHaveLength(2);
        });
    });

    describe('display and displayContainer configuration', () => {
        it('should support display: "tabs" configuration', () => {
            const config = {
                type: 'ObjectProperty',
                display: 'tabs' as 'object' | 'table' | 'tabs',
                properties: {
                    name: {
                        type: 'Property'
                    }
                }
            };

            (config as any).propertyKey = 'testProperty';
            const property = configLoader.createProperty(config) as ObjectProperty;

            expect(property).toBeInstanceOf(ObjectProperty);
            expect(property.display).toBe('tabs');
        });

        it('should support display: "object" configuration', () => {
            const config = {
                type: 'ObjectProperty',
                display: 'object' as 'object' | 'table' | 'tabs',
                properties: {
                    name: {
                        type: 'Property'
                    }
                }
            };

            (config as any).propertyKey = 'testProperty';
            const property = configLoader.createProperty(config) as ObjectProperty;

            expect(property).toBeInstanceOf(ObjectProperty);
            expect(property.display).toBe('object');
        });

        it('should support display: "table" configuration', () => {
            const config = {
                type: 'ObjectProperty',
                display: 'table' as 'object' | 'table' | 'tabs',
                properties: {
                    name: {
                        type: 'Property'
                    }
                }
            };

            (config as any).propertyKey = 'testProperty';
            const property = configLoader.createProperty(config) as ObjectProperty;

            expect(property).toBeInstanceOf(ObjectProperty);
            expect(property.display).toBe('table');
        });

        it('should support displayContainer with custom DisplayConfig', () => {
            const config: any = {
                type: 'ObjectProperty',
                displayContainer: {
                    items: [
                        {
                            type: 'line',
                            items: [
                                { type: 'property', name: 'name' },
                                { type: 'property', name: 'value' }
                            ]
                        }
                    ]
                },
                properties: {
                    name: {
                        type: 'Property'
                    },
                    value: {
                        type: 'Property'
                    }
                }
            };

            (config as any).propertyKey = 'testProperty';
            const property = configLoader.createProperty(config) as ObjectProperty;

            expect(property).toBeInstanceOf(ObjectProperty);
            expect(property.displayContainer).toBeDefined();
            expect(property.displayContainer!.items).toBeDefined();
            expect(property.displayContainer!.items).toHaveLength(1);
            expect(property.displayContainer!.items![0].type).toBe('line');
        });

        it('should support both display and displayContainer together', () => {
            const config: any = {
                type: 'ObjectProperty',
                display: 'tabs' as 'object' | 'table' | 'tabs',
                displayContainer: {
                    items: [
                        { type: 'property', name: 'name' }
                    ]
                },
                properties: {
                    name: {
                        type: 'Property'
                    }
                }
            };

            (config as any).propertyKey = 'testProperty';
            const property = configLoader.createProperty(config) as ObjectProperty;

            expect(property).toBeInstanceOf(ObjectProperty);
            // Both should be set independently
            expect(property.display).toBe('tabs');
            expect(property.displayContainer).toBeDefined();
            expect(property.displayContainer!.items).toBeDefined();
        });
    });
});
