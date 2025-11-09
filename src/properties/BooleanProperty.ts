
import { Property } from './Property';
import { Vault } from '../vault/Vault';

export class BooleanProperty extends Property {

    public override type : string = "boolean";

    constructor(name: string, vault: Vault, args = {}) {
        super(name, vault, args);
    }

     override fillDisplay(value: any, update: (value: any) => Promise<void>, args? : {}) {
            const container = document.createElement('div');
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

            container.appendChild(button);
            return container;
        }
}