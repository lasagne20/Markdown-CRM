import { LinkProperty } from "./LinkProperty";
import { Property } from "./Property";
import { Vault } from "../vault/Vault";
import axios from 'axios';



export class AdressProperty extends LinkProperty{

  public override type : string = "adress";

    // Used for property hidden for the user
    constructor(name : string, vault: Vault, args : {}= {icon: "map-pinned"}) {
      super(name, vault, args)
    }

    
    override validate(value: string) {
      return value;
   }

    override getLink(value: string): string {
      return `https://www.google.com/maps/search/${encodeURIComponent(value)}`;
    }
}