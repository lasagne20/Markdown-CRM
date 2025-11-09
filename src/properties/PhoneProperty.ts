import { LinkProperty } from "./LinkProperty";
import { Property } from "./Property";
import { Vault } from "../vault/Vault";



export class PhoneProperty extends LinkProperty{

  public override type : string = "phone";
  private useInternationalFormat : boolean = false;
  private countryCode : string = "+33"; // Default to France
  
    // Used for property hidden for the user
    constructor(name : string, vault: Vault, args : {icon?: string, defaultFormat?: "national" | "international", countryCode?: string} = {}) {
      super(name, vault, {icon: "phone", ...args});
      this.useInternationalFormat = args.defaultFormat === "international";
      this.countryCode = args.countryCode || "+33";
    }

    override validate(phoneNumber: string) {
      // Remove all non-digit characters
      let cleaned = phoneNumber.replace(/[^0-9+]/g, "");
      
      // Handle international format input (+33...)
      if (cleaned.startsWith("+33")) {
        cleaned = "0" + cleaned.substring(3);
      } else if (cleaned.startsWith("33") && cleaned.length === 11) {
        cleaned = "0" + cleaned.substring(2);
      }
      
      // Remove leading + if present
      cleaned = cleaned.replace(/^\+/, "");
  
      // Must be exactly 10 digits
      if (cleaned.length !== 10) {
          return "";
      }
      
      return this.formatPhone(cleaned);
  }

  private formatPhone(cleaned: string): string {
    if (this.useInternationalFormat) {
      // Format: +33 X XX XX XX XX
      const withoutLeadingZero = cleaned.substring(1);
      return `${this.countryCode} ${withoutLeadingZero.substring(0, 1)} ${withoutLeadingZero.substring(1, 3)} ${withoutLeadingZero.substring(3, 5)} ${withoutLeadingZero.substring(5, 7)} ${withoutLeadingZero.substring(7, 9)}`;
    } else {
      // Format: 0X.XX.XX.XX.XX
      return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1.$2.$3.$4.$5");
    }
  }

  override getPretty(value: string) {
    if (!value) return value;
    
    // Extract digits to reformat
    let cleaned = value.replace(/[^0-9]/g, "");
    
    if (value.includes("+")) {
      // Already in international format
      if (cleaned.startsWith("33") && cleaned.length === 11) {
        cleaned = "0" + cleaned.substring(2);
      }
    }
    
    if (cleaned.length === 10) {
      return this.formatPhone(cleaned);
    }
    
    return "";
 }

  override getLink(value : string){
    // Extract only digits for the callto link
    const cleaned = (value?.replace(/[^0-9+]/g, "") || value) ?? 'undefined';
    return `callto:${cleaned}`;
  }

  override createIconContainer(update: (value: string) => Promise<void>) {
    const iconContainer = document.createElement("div");
    iconContainer.classList.add("icon-container");
    
    if (this.icon) {
      const icon = document.createElement("div");
      this.vault.app.setIcon(icon, this.icon);
      iconContainer.appendChild(icon);
      
      if (!this.static) {
        iconContainer.style.cursor = "pointer";
        iconContainer.style.position = "relative";
        
        // Add format toggle button
        const toggleButton = document.createElement("button");
        toggleButton.className = "phone-format-toggle";
        toggleButton.textContent = this.useInternationalFormat ? "🌍" : "🇫🇷";
        toggleButton.title = this.useInternationalFormat ? "Format international" : "Format national";
        
        toggleButton.addEventListener("click", async (event) => {
          event.stopPropagation();
          event.preventDefault();
          
          // Toggle format
          this.useInternationalFormat = !this.useInternationalFormat;
          toggleButton.textContent = this.useInternationalFormat ? "🌍" : "🇫🇷";
          toggleButton.title = this.useInternationalFormat ? "Format international" : "Format national";
          
          // Reformat the current value
          const metadataField = iconContainer.closest('.metadata-field');
          if (metadataField) {
            const link = metadataField.querySelector('.field-link') as HTMLElement;
            const input = metadataField.querySelector('.field-input') as HTMLInputElement;
            
            if (link && input && input.value) {
              const reformatted = this.validate(input.value);
              if (reformatted) {
                link.textContent = reformatted;
                input.value = reformatted;
                await update(reformatted);
              }
            }
          }
        });
        
        iconContainer.appendChild(toggleButton);
        
        // Add click handler for edit mode
        iconContainer.addEventListener("click", (event) => {
          if (event.target !== toggleButton) {
            this.modifyField(event);
          }
        });
      }
    }
    
    return iconContainer;
  }
}