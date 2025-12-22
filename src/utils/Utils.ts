export function addFold(parentContainer: HTMLElement, childContainer: HTMLElement, app?: any) {
    let isFolded = false;
    const arrow = document.createElement("span");
    arrow.style.cursor = "pointer";
    arrow.style.marginRight = "5px";
    parentContainer.insertBefore(arrow, parentContainer.firstChild);

    const updateArrow = () => {
        arrow.innerHTML = '';
        const iconName = isFolded ? 'chevron-right' : 'chevron-down';
        if (app?.setIcon) {
            app.setIcon(arrow, iconName);
        }
    };

    updateArrow();

    parentContainer.addEventListener("click", () => {
        isFolded = !isFolded;
        childContainer.style.display = isFolded ? "none" : "block";
        updateArrow();
    });
}

export function addButton(buttonText: string, callback: () => void) {
    const button = document.createElement("button");
    button.classList.add("mod-cta");
    button.textContent = buttonText;
    button.addEventListener("click", (e) => {
        e.stopPropagation();
        callback();
    });
    return button;
}

/**
 * Generates a UUID v4 identifier
 * Compatible with both browser and Node.js environments
 * @returns A unique identifier in the format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}