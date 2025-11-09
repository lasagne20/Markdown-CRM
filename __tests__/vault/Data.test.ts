import { Data } from '../../src/vault/Data';

// Test implementation of Data class
class TestData extends Data {
    public static className = 'TestData';

    constructor(name: string) {
        super(name);
    }

    getClasse() {
        return 'TestDataClass';
    }

    static getClasse() {
        return 'TestDataClass';
    }

    public getList(className: string): any[] {
        if (className === 'TestData') {
            return [
                { id: 1, name: 'Item 1' },
                { id: 2, name: 'Item 2' },
                { id: 3, name: 'Item 3' }
            ];
        }
        return [];
    }
}

// Another test implementation
class AnotherTestData extends Data {
    public static className = 'AnotherTestData';

    constructor(name: string) {
        super(name);
        this.generativeData = {
            type: 'generated',
            timestamp: Date.now()
        };
    }

    getClasse() {
        return 'AnotherTestDataClass';
    }

    static getClasse() {
        return 'AnotherTestDataClass';
    }
}

describe('Data', () => {
    let testData: TestData;
    let anotherTestData: AnotherTestData;

    beforeEach(() => {
        testData = new TestData('TestItem');
        anotherTestData = new AnotherTestData('AnotherTestItem');
    });

    describe('Constructor', () => {
        it('should create a Data instance with name', () => {
            expect(testData).toBeInstanceOf(Data);
            expect(testData.name).toBe('TestItem');
        });

        it('should initialize empty generativeData object', () => {
            const data = new Data('EmptyData');
            expect(data.generativeData).toEqual({});
        });

        it('should allow custom properties through indexer', () => {
            testData['customProperty'] = 'customValue';
            expect(testData['customProperty']).toBe('customValue');
        });
    });

    describe('getName method', () => {
        it('should return the name', () => {
            expect(testData.getName()).toBe('TestItem');
        });

        it('should return correct name for different instances', () => {
            expect(anotherTestData.getName()).toBe('AnotherTestItem');
        });
    });

    describe('getClasse methods', () => {
        it('should implement getClasse instance method in subclass', () => {
            expect(testData.getClasse()).toBe('TestDataClass');
            expect(anotherTestData.getClasse()).toBe('AnotherTestDataClass');
        });

        it('should implement getClasse static method in subclass', () => {
            expect(TestData.getClasse()).toBe('TestDataClass');
            expect(AnotherTestData.getClasse()).toBe('AnotherTestDataClass');
        });

        it('should throw error for base Data class getClasse instance method', () => {
            const baseData = new Data('BaseData');
            expect(() => baseData.getClasse()).toThrow('Need to be impleted in the subClasses');
        });

        it('should throw error for base Data class getClasse static method', () => {
            expect(() => Data.getClasse()).toThrow('Need to be impleted in the subClasses');
        });
    });

    describe('getList method', () => {
        it('should return list for known class name', () => {
            const list = testData.getList('TestData');
            expect(list).toHaveLength(3);
            expect(list[0]).toEqual({ id: 1, name: 'Item 1' });
            expect(list[1]).toEqual({ id: 2, name: 'Item 2' });
            expect(list[2]).toEqual({ id: 3, name: 'Item 3' });
        });

        it('should return empty array for unknown class name', () => {
            const list = testData.getList('UnknownClass');
            expect(list).toEqual([]);
        });

        it('should return empty array for base Data class', () => {
            const baseData = new Data('BaseData');
            const list = baseData.getList('AnyClass');
            expect(list).toEqual([]);
        });
    });

    describe('Static className property', () => {
        it('should have className property in subclasses', () => {
            expect(TestData.className).toBe('TestData');
            expect(AnotherTestData.className).toBe('AnotherTestData');
        });

        it('should be undefined in base Data class', () => {
            expect(Data.className).toBeUndefined();
        });
    });

    describe('Generative data', () => {
        it('should initialize empty generativeData by default', () => {
            expect(testData.generativeData).toEqual({});
        });

        it('should allow setting generativeData in constructor', () => {
            expect(anotherTestData.generativeData).toHaveProperty('type', 'generated');
            expect(anotherTestData.generativeData).toHaveProperty('timestamp');
            expect(typeof anotherTestData.generativeData.timestamp).toBe('number');
        });

        it('should allow modifying generativeData after construction', () => {
            testData.generativeData['newProperty'] = 'newValue';
            expect(testData.generativeData['newProperty']).toBe('newValue');
        });

        it('should allow complex objects in generativeData', () => {
            testData.generativeData = {
                config: {
                    enabled: true,
                    options: ['option1', 'option2']
                },
                metadata: {
                    version: '1.0.0'
                }
            };

            expect(testData.generativeData.config.enabled).toBe(true);
            expect(testData.generativeData.config.options).toHaveLength(2);
            expect(testData.generativeData.metadata.version).toBe('1.0.0');
        });
    });

    describe('Dynamic properties', () => {
        it('should allow setting and getting dynamic properties', () => {
            testData['dynamicProp1'] = 'value1';
            testData['dynamicProp2'] = { nested: 'object' };
            testData['dynamicProp3'] = [1, 2, 3];

            expect(testData['dynamicProp1']).toBe('value1');
            expect(testData['dynamicProp2']).toEqual({ nested: 'object' });
            expect(testData['dynamicProp3']).toEqual([1, 2, 3]);
        });

        it('should handle undefined dynamic properties', () => {
            expect(testData['nonExistentProp']).toBeUndefined();
        });

        it('should allow overwriting dynamic properties', () => {
            testData['prop'] = 'original';
            expect(testData['prop']).toBe('original');

            testData['prop'] = 'updated';
            expect(testData['prop']).toBe('updated');
        });
    });

    describe('Edge cases', () => {
        it('should handle empty name', () => {
            const emptyNameData = new TestData('');
            expect(emptyNameData.getName()).toBe('');
        });

        it('should handle name with special characters', () => {
            const specialNameData = new TestData('Test@#$%^&*()_+{}|:<>?');
            expect(specialNameData.getName()).toBe('Test@#$%^&*()_+{}|:<>?');
        });

        it('should handle very long names', () => {
            const longName = 'a'.repeat(1000);
            const longNameData = new TestData(longName);
            expect(longNameData.getName()).toBe(longName);
        });

        it('should handle null/undefined in generativeData', () => {
            testData.generativeData['nullProp'] = null;
            testData.generativeData['undefinedProp'] = undefined;

            expect(testData.generativeData['nullProp']).toBeNull();
            expect(testData.generativeData['undefinedProp']).toBeUndefined();
        });
    });

    describe('Type compatibility', () => {
        it('should be assignable to Data type', () => {
            const dataArray: Data[] = [testData, anotherTestData];
            expect(dataArray).toHaveLength(2);
        });

        it('should maintain polymorphic behavior', () => {
            const dataArray: Data[] = [testData, anotherTestData];
            
            expect(dataArray[0].getName()).toBe('TestItem');
            expect(dataArray[1].getName()).toBe('AnotherTestItem');
            
            expect(dataArray[0].getClasse()).toBe('TestDataClass');
            expect(dataArray[1].getClasse()).toBe('AnotherTestDataClass');
        });
    });

    describe('Memory and performance', () => {
        it('should handle large amounts of dynamic properties', () => {
            for (let i = 0; i < 1000; i++) {
                testData[`prop${i}`] = `value${i}`;
            }

            expect(testData['prop0']).toBe('value0');
            expect(testData['prop999']).toBe('value999');
        });

        it('should handle complex nested objects', () => {
            const complexObject = {
                level1: {
                    level2: {
                        level3: {
                            data: 'deep nested value'
                        }
                    }
                }
            };

            testData['complex'] = complexObject;
            expect(testData['complex'].level1.level2.level3.data).toBe('deep nested value');
        });
    });
});