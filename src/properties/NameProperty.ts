import { Property } from "./Property";
import { Vault } from "../vault/Vault";

export class NameProperty extends Property{

     public override type : string = "name";

    // Used for property hidden for the user
    constructor(vault: Vault) {
      super("name", vault, {static : true});
    }

    override read(classe: any) {
      const file = classe.getFile();
      return file ? file.getLink() : '';
    }

}