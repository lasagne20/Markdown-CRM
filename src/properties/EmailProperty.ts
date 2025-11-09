import { LinkProperty } from "./LinkProperty";
import { Property } from "./Property";
import { Vault } from "../vault/Vault";



export class EmailProperty extends LinkProperty{


  public override type : string = "email";
    // Used for property hidden for the user
    constructor(name : string, vault: Vault, args : {} =  {icon: "mail"}) {
      super(name, vault, args)
    }

    override validate(email: string): string {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if(emailRegex.test(email)){
          return email
      }
      return ""
    }

    override createFieldContainer() {
      const field = document.createElement("div");
      field.classList.add("metadata-field");
      field.classList.add("metadata-field-email");
      return field;
  }

    override getLink(value: string): string {
      return `mailto:${value}`
    }


}