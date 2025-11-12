import { Classe } from '../vault/Classe';
// import { SubClass } from 'Old files/SubClasses/SubClass'; // TODO: Fix SubClass import
import { File } from '../vault/File';
import { Property } from './Property';
import { SelectProperty } from './SelectProperty';

// Temporary type for SubClass - TODO: Replace with actual SubClass import
type SubClass = any;

export class SubClassProperty extends SelectProperty {

    public subClasses: SubClass[];
    public override type : string = "subClass";

    constructor(name: string, vault: any, subClasses: SubClass[], args = {}) {
        super(name, vault, subClasses.map(subClass => ({ name: subClass.getsubClassName(), color: "" })), args);
        this.subClasses = subClasses;
    }

    getSubClassFromName(name : string){
        return this.subClasses.find(subClass => subClass.getsubClassName() === name)?.getConstructor()
    }

    public getSubClass(classe: any) : SubClass | undefined {
        let value = this.read(classe)
        return this.subClasses.find(subClass => subClass.getsubClassName() === value);
    }

    public getSubclassesNames(): SubClass[] {
        return this.subClasses;
    }

    public getSubClassProperty(classe: any) : Property[] {
        let properties = this.getSubClass(classe)?.getProperties();
        if (properties){
            return Object.values(properties);
        }
        return [];
    }

    getTopDisplayContent(file: Classe) : HTMLElement {
        const container = document.createElement("div");
        let subClass = this.getSubClass(file);
        if (subClass){
            container.appendChild(subClass.getTopDisplayContent(file));
        }
        return container;

    }
}