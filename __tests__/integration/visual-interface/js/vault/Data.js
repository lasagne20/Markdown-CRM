export class Data {
    constructor(name) {
        this.name = name;
        this.generativeData = {};
    }
    getName() {
        return this.name;
    }
    getClasse() {
        throw Error("Need to be impleted in the subClasses");
    }
    static getClasse() {
        throw Error("Need to be impleted in the subClasses");
    }
    getList(classeName) {
        return [];
    }
}
