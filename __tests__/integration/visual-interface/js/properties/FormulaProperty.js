import { LinkProperty } from './LinkProperty.js';
export class FormulaProperty extends LinkProperty {
    constructor(name, vault, formula, args = { icon: "", static: true, write: false }) {
        super(name, vault, args);
        this.type = "formula";
        this.write = false;
        this.formula = formula;
        this.write = args.write ?? false;
    }
    validate(value) {
        return value;
    }
    read(file) {
        // Get all properties from the file
        const allFileProperties = file.getAllProperties() || {};
        // Convert properties to their actual values
        const allProperties = {};
        for (const [key, prop] of Object.entries(allFileProperties)) {
            if (key !== this.name) { // Exclude self to avoid circular reference
                allProperties[key] = file.getMetadataValue(key);
            }
        }
        try {
            const sanitizedProperties = Object.keys(allProperties).reduce((acc, key) => {
                const sanitizedKey = key.replace(/\s+/g, "");
                acc[sanitizedKey] = allProperties[key];
                return acc;
            }, {});
            const formulaContent = `
                    const properties = ${JSON.stringify(sanitizedProperties)};
                    const name = "${file.getName(false)}";
                    const { ${Object.keys(sanitizedProperties).join(", ")} } = properties;
                    ${this.formula.includes("return") ? "" : "return "}${this.formula};
                `;
            const formulaFunction = new Function("vault", "file", formulaContent);
            let value = formulaFunction(file.vault, file);
            if (this.write) {
                let currentValue = file.getMetadataValue(this.name);
                if (currentValue !== value) {
                    file.updateMetadata(this.name, value);
                }
            }
            return value;
        }
        catch (error) {
            if (error instanceof ReferenceError) {
                console.error("Formula error : " + this.formula + "\n\n"
                    + error
                    + "\n\nThis is all the properties available : ", Object.keys(allProperties).join(", "));
            }
            else {
                console.error("Formula error : " + this.formula + "\n\n" + error);
            }
            return null;
        }
    }
    getPretty(value) {
        if (!value)
            return value;
        if (typeof value !== "string") {
            console.error("Value is not a string:", value);
            return value;
        }
        // Check if it's a date
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // Matches "YYYY-MM-DD"
        if (dateRegex.test(value)) {
            const parsedDate = new Date(value);
            return parsedDate.toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric"
            });
        }
        if (!isNaN(Number(value)) && Number.isInteger(Number(value))) {
            return Number(value).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return value.replace(/^https?:\/\//, "").replace("[[", "").replace("]]", "");
    }
    getLink(value) {
        if (!value)
            return value;
        // Check if it's an email
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (emailRegex.test(value)) {
            return `mailto:${value}`;
        }
        // Check if it's an Obsidian link [[...]]
        const obsidianLinkRegex = /\[\[([^\]]+)\]\]/;
        try {
            const match = value.match(obsidianLinkRegex);
            if (match && match[1]) {
                return `obsidian://open?vault=${this.vault.getName()}&file=${encodeURIComponent(this.vault.readLinkFile(match[1], true)[1])}`;
            }
            // Check if it's a valid URL
            const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9_-]+\.)+[a-zA-Z]{2,6}(\/[a-zA-Z0-9_-]+)*\/?$/;
            if (urlRegex.test(value)) {
                return value.startsWith("http") ? value : `http://${value}`;
            }
        }
        catch (error) {
            console.error(`Error parsing link for ${value}:`, error);
        }
        return value;
    }
}
