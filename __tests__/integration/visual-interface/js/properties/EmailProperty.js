import { LinkProperty } from './LinkProperty.js';
export class EmailProperty extends LinkProperty {
    // Used for property hidden for the user
    constructor(name, vault, args = { icon: "mail" }) {
        super(name, vault, args);
        this.type = "email";
    }
    validate(email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (emailRegex.test(email)) {
            return email;
        }
        return "";
    }
    createFieldContainer() {
        const field = document.createElement("div");
        field.classList.add("metadata-field");
        field.classList.add("metadata-field-email");
        return field;
    }
    getLink(value) {
        return `mailto:${value}`;
    }
}
