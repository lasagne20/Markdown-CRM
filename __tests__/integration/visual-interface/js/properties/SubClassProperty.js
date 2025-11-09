import { SelectProperty } from './SelectProperty.js';
export class SubClassProperty extends SelectProperty {
    constructor(name, vault, subClasses, args = {}) {
        super(name, vault, subClasses.map(subClass => ({ name: subClass.getsubClassName(), color: "" })), args);
        this.type = "subClass";
        this.subClasses = subClasses;
    }
    getSubClassFromName(name) {
        return this.subClasses.find(subClass => subClass.getsubClassName() === name)?.getConstructor();
    }
    getSubClass(file) {
        let value = this.read(file);
        return this.subClasses.find(subClass => subClass.getsubClassName() === value);
    }
    getSubclassesNames() {
        return this.subClasses;
    }
    getSubClassProperty(file) {
        let properties = this.getSubClass(file)?.getProperties();
        if (properties) {
            return Object.values(properties);
        }
        return [];
    }
    getTopDisplayContent(file) {
        const container = document.createElement("div");
        let subClass = this.getSubClass(file);
        if (subClass) {
            container.appendChild(subClass.getTopDisplayContent(file));
        }
        return container;
    }
}
