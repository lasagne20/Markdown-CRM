import { Property } from './Property.js';
export class TextProperty extends Property {
    constructor(name, vault, args = {}) {
        super(name, vault, args);
        this.type = "text";
    }
    createFieldInput(value) {
        const textarea = document.createElement("textarea");
        textarea.value = value || "";
        textarea.classList.add("field-textarea");
        textarea.rows = 4; // Default number of rows
        textarea.style.resize = "vertical"; // Allow vertical resizing
        // Add autocomplete functionality
        textarea.setAttribute("data-keydown-listener", "false");
        textarea.oninput = async () => await this.handleAutocomplete(textarea);
        return textarea;
    }
    createFieldContainer() {
        const field = document.createElement("div");
        field.classList.add("metadata-textfield");
        return field;
    }
    createFieldLink(value) {
        console.log("Name of the property:", this.name);
        console.log("Creating field link with value:", value);
        const link = document.createElement("div");
        // Ensure value is a string - handle arrays or other types
        const stringValue = typeof value === 'string' ? value :
            (Array.isArray(value) ? value.join(', ') :
                (value ? String(value) : ''));
        link.innerHTML = stringValue
            ? stringValue.replace(/\[\[(.*?)(?:\|(.*?))?\]\]/g, (_match, path, alias) => {
                const display = alias || path;
                return `<strong><a href="#">${display}</a></strong>`;
            })
            : "";
        link.classList.add("field-textlink");
        link.style.cursor = this.static ? "default" : "text";
        if (!this.static) {
            link.onclick = (event) => this.modifyField(event);
        }
        // Add click event for links
        link.querySelectorAll("a").forEach(anchor => {
            anchor.onclick = async (event) => {
                event.preventDefault();
                const target = event.target.textContent;
                if (target) {
                    const classe = await this.vault.getFromLink(target);
                    if (classe) {
                        let path = classe.getPath();
                        if (path) {
                            await this.vault.app.open(path);
                        }
                    }
                    else {
                        this.vault.app.sendNotice(`Le fichier ${target}.md n'existe pas`);
                    }
                }
            };
        });
        return link;
    }
    modifyField(event) {
        const link = event.target.closest('.metadata-textfield')?.querySelector('.field-textlink');
        const input = event.target.closest('.metadata-textfield')?.querySelector('.field-textarea');
        if (link && input) {
            link.style.display = "none";
            input.style.display = "block";
            input.focus();
        }
    }
    handleFieldInput(update, input, link) {
        input.onblur = async () => {
            if (!input.parentElement?.querySelector(".autocomplete-dropdown")) {
                await this.updateField(update, input, link);
                return;
            }
        };
        input.onkeydown = async (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                await this.updateField(update, input, link);
            }
        };
    }
    async handleAutocomplete(textarea) {
        let dropdown = textarea.parentElement?.querySelector(".autocomplete-dropdown");
        // Remove existing dropdown if present
        if (dropdown) {
            dropdown.remove();
        }
        dropdown = document.createElement("div");
        dropdown.classList.add("autocomplete-dropdown");
        const cursorPosition = textarea.selectionStart || 0;
        const textBeforeCursor = textarea.value.substring(0, cursorPosition);
        const lastWordMatch = textBeforeCursor.match(/(\S+)$/);
        const query = lastWordMatch ? lastWordMatch[0].toLowerCase() : "";
        if (!query) {
            return; // No query, don't show the dropdown
        }
        /* TODO
        const files = (await this.vault.app.listFiles());
        const suggestions = files.filter((file: File) =>
          file.getName().toLowerCase().includes(query)
        );*/
        const files = await this.vault.app.listFiles();
        const suggestions = files.filter((file) => file.name.toLowerCase().includes(query));
        if (suggestions.length === 0) {
            return; // No suggestions, don't show the dropdown
        }
        // Calculate the position of the word being edited
        const textBeforeWord = textBeforeCursor.substring(0, lastWordMatch?.index || 0);
        const tempSpan = document.createElement("span");
        tempSpan.style.visibility = "hidden";
        tempSpan.style.whiteSpace = "pre-wrap";
        tempSpan.style.position = "absolute";
        tempSpan.style.font = window.getComputedStyle(textarea).font;
        tempSpan.textContent = textBeforeWord;
        document.body.appendChild(tempSpan);
        const rect = tempSpan.getBoundingClientRect();
        const textareaRect = textarea.getBoundingClientRect();
        dropdown.style.top = `${textareaRect.top + rect.height + window.scrollY}px`;
        dropdown.style.left = `${textareaRect.left + rect.width + window.scrollX}px`;
        dropdown.style.width = `${textareaRect.width}px`;
        document.body.removeChild(tempSpan);
        suggestions.forEach((file, index) => {
            const item = document.createElement("div");
            item.classList.add("autocomplete-item");
            item.textContent = file.name;
            item.tabIndex = 0; // Make it focusable
            item.dataset.index = index.toString();
            item.onclick = () => {
                this.insertSuggestion(textarea, `[[${file.path}|${file.name}]]`, lastWordMatch?.index || 0, query.length);
                dropdown.remove();
            };
            dropdown.appendChild(item);
        });
        textarea.parentElement?.appendChild(dropdown);
        // Adjust the parent's style to position the dropdown correctly
        const parent = textarea.parentElement;
        parent.style.position = "flex";
        parent.style.flexDirection = "column";
        let selectedIndex = -1;
        const updateSelection = (newIndex) => {
            const items = dropdown.querySelectorAll(".autocomplete-item");
            if (selectedIndex >= 0) {
                items[selectedIndex].classList.remove("selected");
            }
            selectedIndex = newIndex;
            if (selectedIndex >= 0 && selectedIndex < items.length) {
                items[selectedIndex].classList.add("selected");
                items[selectedIndex].scrollIntoView({ block: "nearest" });
            }
        };
        const handleKeyDown = (event) => {
            const items = dropdown.querySelectorAll(".autocomplete-item");
            if (event.key === "ArrowDown") {
                event.preventDefault();
                updateSelection((selectedIndex + 1) % items.length);
            }
            else if (event.key === "ArrowUp") {
                event.preventDefault();
                updateSelection((selectedIndex - 1 + items.length) % items.length);
            }
            else if (event.key === "Escape") {
                dropdown.remove();
                textarea.removeEventListener("keydown", handleKeyDown); // Clean up event listener
                textarea.removeEventListener("keydown", handleEnter);
            }
        };
        let isEnterHandled = false;
        const handleEnter = (event) => {
            const items = dropdown.querySelectorAll(".autocomplete-item");
            if (event.key === "Enter") {
                if (isEnterHandled)
                    return; // Empêche l'exécution multiple
                isEnterHandled = true;
                textarea.removeEventListener("keydown", handleKeyDown);
                textarea.removeEventListener("keydown", handleEnter);
                dropdown.remove();
                event.preventDefault();
                const items = dropdown.querySelectorAll(".autocomplete-item");
                if (selectedIndex >= 0 && selectedIndex < items.length) {
                    const selectedItem = items[selectedIndex];
                    const suggestion = selectedItem.textContent || "";
                    this.insertSuggestion(textarea, `[[${suggestion}]]`, lastWordMatch?.index || 0, query.length);
                }
            }
        };
        if (!textarea.hasAttribute("data-keydown-listener")) {
            textarea.addEventListener("keydown", handleKeyDown);
            textarea.addEventListener("keydown", handleEnter);
            textarea.setAttribute("data-keydown-listener", "true");
        }
        const removeDropdown = () => {
            dropdown.remove();
            textarea.removeEventListener("keydown", handleKeyDown);
        };
        document.addEventListener("click", (event) => {
            if (!dropdown.contains(event.target) && event.target !== textarea) {
                removeDropdown();
            }
        }, { once: true });
    }
    insertSuggestion(textarea, suggestion, startIndex, queryLength) {
        console.log(textarea, suggestion, startIndex, queryLength);
        const before = textarea.value.substring(0, startIndex);
        const after = textarea.value.substring(startIndex + queryLength);
        textarea.value = `${before}${suggestion}${after}`;
        textarea.setSelectionRange(before.length + suggestion.length, before.length + suggestion.length);
        textarea.focus();
    }
}
