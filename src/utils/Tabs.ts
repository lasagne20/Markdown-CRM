export class Tabs {
    private container: HTMLElement;
    private tabContainer: HTMLElement;
    private contentContainer: HTMLElement;
    private elements: { [key: string]: HTMLElement };

    constructor() {
        this.container = document.createElement("div");
        this.tabContainer = document.createElement("div");
        this.contentContainer = document.createElement("div");

        this.tabContainer.style.display = "flex";
        this.tabContainer.style.marginBottom = "10px";

        this.container.appendChild(this.tabContainer);
        this.container.appendChild(this.contentContainer);

        this.elements = {};
    }

    addTab(key: string, element: HTMLElement) {
        this.elements[key] = element;

        const tab = document.createElement("div");
        tab.textContent = key;
        tab.style.cursor = "pointer";
        tab.style.padding = "5px 10px";
        tab.style.border = "1px solid #ccc";
        tab.style.borderBottom = "none";
        tab.style.marginRight = "5px";

        tab.addEventListener("click", () => {
            // Hide all elements
            Object.values(this.elements).forEach(el => el.style.display = "none");
            // Show the selected element
            this.elements[key].style.display = "block";

            // Remove active class from all tabs
            Array.from(this.tabContainer.children).forEach(child => child.classList.remove("active-tab"));
            // Add active class to the clicked tab
            tab.classList.add("active-tab");
        });

        this.tabContainer.appendChild(tab);

        // Append the element to the content container but keep it hidden
        element.style.display = "none";
        this.contentContainer.appendChild(element);

        // Select the first tab by default if it's the only one
        if (this.tabContainer.children.length === 1) {
            tab.classList.add("active-tab");
            element.style.display = "block";
        }
    }

    getContainer(): HTMLElement {
        return this.container;
    }
}
