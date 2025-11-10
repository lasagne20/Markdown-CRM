import { setIcon } from "../App";



export function addFold(parentContainer: HTMLElement, childContainer: HTMLElement) {
    let isFolded = false;
    const arrow = document.createElement("span");
    arrow.style.cursor = "pointer";
    arrow.style.marginRight = "5px";
    parentContainer.insertBefore(arrow, parentContainer.firstChild);

    const updateArrow = () => {
        arrow.innerHTML = '';
        const iconName = isFolded ? 'chevron-right' : 'chevron-down';
        setIcon(arrow, iconName);
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