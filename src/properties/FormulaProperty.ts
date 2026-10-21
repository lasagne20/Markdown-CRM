import { Classe } from '../vault/Classe';
import { LinkProperty } from './LinkProperty';
import { Vault } from '../vault/Vault';


export class FormulaProperty extends LinkProperty {

    public formula : string;
    public override type : string = "formula";
    public write : boolean = false;

    constructor(name : string, vault: Vault, formula: string, args : {icon: string, static?: boolean, write?: boolean, tooltip?: string} = {icon: "", static: true, write: false}) {
        super(name, vault, args);
        this.formula = formula;
        this.write = args.write ?? false;
    }

    override validate(value: string): string {
        return value;
    }

    /**
     * Extract the property names a formula depends on.
     *
     * The formula receives the class properties as JS identifiers under their
     * sanitized names (whitespace removed, see read()). Dependencies are the
     * known property names whose sanitized form appears in the formula as a
     * whole identifier. Lookarounds are used instead of \b so accented names
     * are handled correctly; regex special characters in names are escaped.
     *
     * False positives (name appearing inside a string literal) only cause a
     * superfluous re-render. False negatives (name built dynamically) are
     * practically nonexistent.
     */
    static extractDependencies(formula: string, propertyNames: string[]): string[] {
        if (!formula) {
            return [];
        }
        const dependencies: string[] = [];
        for (const name of propertyNames) {
            const sanitized = name.replace(/\s+/g, "");
            if (!sanitized) {
                continue;
            }
            const escaped = sanitized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`);
            if (regex.test(formula)) {
                dependencies.push(name);
            }
        }
        return dependencies;
    }

    override async read(classe: Classe) : Promise<any> {
        // Get all properties from the classe
        const allFileProperties = classe.getAllProperties() || {};
        // Convert properties to their actual values
        const allProperties: Record<string, any> = {};
        
        for (const [key, prop] of Object.entries(allFileProperties)) {
            if (key !== this.name) { // Exclude self to avoid circular reference
                allProperties[key] = await classe.getPropertyValue(key);
            }
        }
        
        try {
            const sanitizedProperties = Object.keys(allProperties).reduce((acc: Record<string, any>, key) => {
                const sanitizedKey: string = key.replace(/\s+/g, "");
                acc[sanitizedKey] = allProperties[key];
                return acc;
            }, {} as Record<string, any>);

            const getName = () => classe.getName();

            const formulaContent = 
                `
                    const properties = ${JSON.stringify(sanitizedProperties)};
                    const name = "${getName()}";
                    const { ${Object.keys(sanitizedProperties).join(", ")} } = properties;
                    ${this.formula.includes("return") ? "" : "return "}${this.formula};
                `;

            const vault = classe.getVault();
            const formulaFunction = new Function("vault", "file", formulaContent);
            let value = formulaFunction(vault, classe);
            if (this.write) {
                let currentValue = await classe.getPropertyValue(this.name);
                if (currentValue !== value){
                    await classe.updatePropertyValue(this.name, value);
                } 
            }
            return value;
        } catch (error) {
            if (error instanceof ReferenceError){
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
    override getPretty(value: string) {
        if (!value) return value;
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
            return Number(value).toLocaleString("fr-FR",{ minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        
        return value.replace(/^https?:\/\//, "").replace("[[", "").replace("]]", "");

    }

    override getLink(value: string): string {
        if (!value) return value;

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
                const filePath = this.vault.readLinkFile(match[1], true);
                if (filePath) {
                    return this.vault.app.getUrl(filePath);
                }
            }

            // Check if it's a valid URL
            const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9_-]+\.)+[a-zA-Z]{2,6}(\/[a-zA-Z0-9_-]+)*\/?$/;
            if (urlRegex.test(value)) {
                return value.startsWith("http") ? value : `http://${value}`;
            }
        } catch (error) {
            console.error(`Error parsing link for ${value}:`, error);
        }

        return value;
    }

}