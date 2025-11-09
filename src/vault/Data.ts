export class Data {
    [key: string]: any;
    public static className : string;
    public generativeData : { [key : string] : any} = {};

    constructor(
        public name: string
    ) {
    }


    public getName(){
        return this.name
    }


    getClasse(){
        throw Error("Need to be impleted in the subClasses")
    }

    static getClasse(){
        throw Error("Need to be impleted in the subClasses")
    }

    public getList(classeName: string) : any[]{
        return []
    }
}