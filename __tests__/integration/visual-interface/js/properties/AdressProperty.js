import { LinkProperty } from './LinkProperty.js';
export class AdressProperty extends LinkProperty {
    // Used for property hidden for the user
    constructor(name, vault, args = { icon: "map-pinned" }) {
        super(name, vault, args);
        this.type = "adress";
    }
    validate(value) {
        return value;
    }
    getLink(value) {
        return `https://www.google.com/maps/search/${encodeURIComponent(value)}`;
    }
}
