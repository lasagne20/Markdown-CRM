import { Property } from './Property.js';
export class BooleanProperty extends Property {
    constructor(name, vault, args = {}) {
        super(name, vault, args);
        this.type = "boolean";
    }
    fillDisplay(value, update, args) {
        const container = document.createElement('div');
        const button = document.createElement('span');
        // Ajouter les classes CSS de base
        button.classList.add('boolean-property-button');
        button.tabIndex = 0; // Make focusable for accessibility
        this.vault.app.setIcon(button, this.icon);
        // Keep track of current state internally
        let currentValue = Boolean(value);
        const updateButtonState = (newValue) => {
            if (newValue) {
                button.classList.add('boolean-property-button-active');
            }
            else {
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
            button.onkeydown = async (e) => {
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
