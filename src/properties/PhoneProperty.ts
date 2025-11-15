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
      
      // Get format from global settings
      const settings = this.vault.app.getSettings();
      const phoneFormat = settings.phoneFormat || 'FR';
      
      // Override with args if provided, otherwise use settings
      if (args.defaultFormat) {
        this.useInternationalFormat = args.defaultFormat === "international";
      } else {
        this.useInternationalFormat = phoneFormat === 'INTL';
      }
      
      // Map country format to country code
      if (args.countryCode) {
        this.countryCode = args.countryCode;
      } else {
        this.countryCode = this.getCountryCode(phoneFormat);
      }
    }
    
    private getCountryCode(format: string): string {
      const countryCodeMap: { [key: string]: string } = {
        'FR': '+33',
        'US': '+1',
        'UK': '+44',
        'DE': '+49',
        'ES': '+34',
        'IT': '+39',
        'INTL': '+33' // Default to FR for international
      };
      return countryCodeMap[format] || '+33';
    }

    override validate(phoneNumber: string) {
      if (!phoneNumber) return "";
      
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
    if (!value || typeof value !== 'string') return '';
    
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
    if (!value || typeof value !== 'string') return 'callto:';
    const cleaned = value.replace(/[^0-9+]/g, "");
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
        iconContainer.addEventListener("click", (event) => {
          this.modifyField(event);
        });
      }
    }
    
    return iconContainer;
  }
}