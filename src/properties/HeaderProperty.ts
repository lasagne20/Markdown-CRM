import { LinkProperty } from "./LinkProperty";
import { Property } from "./Property";
import axios from 'axios';
import { Vault } from "../vault/Vault";

// Temporary type declarations for missing imports
declare const Notice: any;
declare const TFile: any;

export class HearderProperty extends Property {
  public override type: string = "header";

  constructor(name: string, vault: Vault, args = {}) {
    super(name, vault, args);
  }

  override fillDisplay(value: any, update: (value: any) => Promise<void>, args : {size ?: string} = {size : "2em"}) {
        const field = this.createFieldContainer();
        const fieldContainer = this.createFieldContainerContent(update, value);
        
        if (fieldContainer && args.size) {
            const link = fieldContainer.querySelector('.field-headerlink') as HTMLElement;
            const input = fieldContainer.querySelector('.field-header') as HTMLInputElement;
            input.style.fontSize = args.size;
            link.style.fontSize = args.size;
        }

        field.appendChild(fieldContainer);
        return field;
    }

  override createFieldInput(value: string) {
    const input = document.createElement("input");
    input.type = "text";
    input.value = value || "";
    input.classList.add("field-header");
    

    return input;
  }

  override createFieldContainer() {
    const field = document.createElement("div");
    field.classList.add("metadata-headerfield");
    return field;
  }

  override createFieldLink(value: string) {
    const link = document.createElement("h2");
    link.innerHTML = value || "";
    link.classList.add("field-headerlink");
    link.style.cursor = this.static ? "default" : "text";
    
    if (!this.static) {
      link.onclick = (event) => this.modifyField(event);
    }
    return link;
  }

  override modifyField(event: Event) {
    const link = (event.target as HTMLElement).closest('.metadata-headerfield')?.querySelector('.field-headerlink') as HTMLElement;
    const input = (event.target as HTMLElement).closest('.metadata-headerfield')?.querySelector('.field-header') as HTMLInputElement;
    if (link && input) {
      link.style.display = "none";
      input.style.display = "block";
      input.focus();
    }
  }

  override handleFieldInput(update: (value: string) => Promise<void>, input: HTMLInputElement | HTMLTextAreaElement, link: HTMLElement) {
    input.onblur = async () => {
        await this.updateField(update, input, link);
        return;
    };

    input.onkeydown = async (event) => {
        if ((event as KeyboardEvent).key === "Escape" || (event as KeyboardEvent).key === "Enter") {
                event.preventDefault();
                await this.updateField(update, input, link);
        }
    };
  }
}
