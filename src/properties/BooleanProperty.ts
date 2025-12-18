
import { Property } from './Property';
import { Vault } from '../vault/Vault';

export class BooleanProperty extends Property {

    public override type : string = "boolean";

    constructor(name: string, vault: Vault, args: {icon?: string, aliases?: string[], tooltip?: string} = {}) {
        super(name, vault, args);
    }

     override fillDisplay(value: any, update: (value: any) => Promise<void>, args? : {}) {
            const container = document.createElement('div');
            container.classList.add('metadata-field');

            if (this.title) {
                const title = document.createElement("div");
                title.textContent = this.title;
                title.classList.add("metadata-title");
                container.appendChild(title);
            }

            const contentRow = document.createElement("div");
            contentRow.style.display = "flex";
            contentRow.style.alignItems = "center";
            contentRow.style.justifyContent = "center";
            contentRow.style.gap = "4px";

            const button = document.createElement('span');
            
            // Ajouter les classes CSS de base
            button.classList.add('boolean-property-button');
            button.tabIndex = 0; // Make focusable for accessibility
            this.vault.app.setIcon(button, this.icon);

            // Keep track of current state internally
            let currentValue = Boolean(value);

            const updateButtonState = (newValue: boolean) => {
                if (newValue) {
                    button.classList.add('boolean-property-button-active');
                } else {
                    button.classList.remove('boolean-property-button-active');
                }
            };
            
            // Set initial state
            updateButtonState(currentValue);

            if (!this.static) {
                button.onclick = async () => {
                    currentValue = !currentValue;
                    updateButtonState(currentValue);
                    await update(currentValue);
                };

                // Support keyboard interaction (Enter/Space)
                button.onkeydown = async (e: KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        currentValue = !currentValue;
                        updateButtonState(currentValue);
                        await update(currentValue);
                    }
                };
            }

            contentRow.appendChild(button);
            container.appendChild(contentRow);
            return container;
        }
}