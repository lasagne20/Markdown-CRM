import { DisplayItem } from '../Config/interfaces';
import { Property } from '../properties/Property';
import { Vault } from '../vault/Vault';
import { Classe } from '../vault/Classe';
import { addFold } from '../utils/Utils';
import { DynamicTable } from './DynamicTable';

/**
 * Utility class for rendering display configurations
 * Used by both ClassConfigManager and ObjectProperty
 */
export class DisplayRenderer {
    private vault: Vault;
    private properties: { [key: string]: Property };
    private context: any; // The Classe instance or object data
    private updateCallback?: (propertyName: string, value: any) => Promise<void>;

    constructor(
        vault: Vault, 
        properties: { [key: string]: Property }, 
        context: any,
        updateCallback?: (propertyName: string, value: any) => Promise<void>
    ) {
        this.vault = vault;
        this.properties = properties;
        this.context = context;
        this.updateCallback = updateCallback;
    }

    async renderDisplayItems(container: HTMLElement, items: DisplayItem[]): Promise<void> {
        for (const item of items) {
            const element = await this.renderDisplayItem(item);
            if (element) {
                container.appendChild(element);
            }
        }
    }

    private async renderDisplayItem(item: DisplayItem): Promise<HTMLElement | null> {
        switch (item.type) {
            case 'property':
                return await this.renderProperty(item);
            
            case 'button':
                return this.renderButton(item);
            
            case 'line':
            case 'column':
                return await this.renderContainer(item);
            
            case 'tabs':
                return await this.renderTabs(item);
            
            case 'fold':
                return await this.renderFold(item);
            
            case 'table':
                return await this.renderTable(item, this.context);
            
            default:
                console.warn(`Unknown display item type: ${(item as any).type}`);
                return null;
        }
    }

    private async renderProperty(item: any): Promise<HTMLElement | null> {
        const property = this.properties[item.name];
        if (!property) {
            console.warn(`Property not found: ${item.name}`);
            return null;
        }
        
        // Store original values to restore them after rendering
        const originalDisplay = (property as any).display;
        const originalTitle = (property as any).title;
        
        try {
            // Temporarily apply custom configurations (will be restored in finally block)
            if (item.display && property instanceof Object && 'display' in property) {
                (property as any).display = item.display;
            }
            
            if (item.title) {
                (property as any).title = item.title;
            }
            
            // For ObjectProperty context (array of objects), get value from context
            let value: any;
            if (Array.isArray(this.context)) {
                // Context is object data from ObjectProperty
                value = this.context[0]?.[item.name];
            } else {
                // Context is a Classe instance
                value = this.context.getValue ? await this.context.getValue(property.name) : undefined;
            }

            // Create update callback for this specific property
            const updateFn = this.updateCallback 
                ? async (newValue: any) => await this.updateCallback!(property.name, newValue)
                : async (newValue: any) => {
                    if (this.context.updateValue) {
                        await this.context.updateValue(property.name, newValue);
                    }
                };

            // For Classe context, use getDisplay
            let result: HTMLElement | null;
            if (this.context.getProperties) {
                result = await property.getDisplay(this.context, {
                    title: item.title, 
                    staticMode: item.static
                });
            } else {
                // For ObjectProperty context, use fillDisplay directly
                result = property.fillDisplay(value, updateFn);
            }
            
            return result;
        } finally {
            // Restore original values to prevent mutation of shared instances
            if (item.display && property instanceof Object && 'display' in property) {
                (property as any).display = originalDisplay;
            }
            
            if (item.title) {
                (property as any).title = originalTitle;
            }
        }
    }

    private renderButton(item: any): HTMLElement {
        const button = document.createElement("button");
        button.classList.add("mod-cta", "crm-action-button");
        button.textContent = item.label || "Action";
        
        if (item.icon) {
            const icon = document.createElement("span");
            icon.classList.add("button-icon");
            this.vault.app.setIcon(icon, item.icon);
            button.insertBefore(icon, button.firstChild);
        }
        
        if (item.className) {
            button.classList.add(item.className);
        }
        
        button.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (this.context.executeProcess) {
                await this.context.executeProcess(item.process);
            }
        });
        
        return button;
    }

    private async renderContainer(item: any): Promise<HTMLElement> {
        const wrapper = document.createElement("div");
        wrapper.classList.add("metadata-container-wrapper");
        
        if (item.className) {
            wrapper.classList.add(item.className);
        }
        
        if (item.title) {
            const title = document.createElement("h3");
            title.textContent = item.title;
            title.classList.add("container-section-title");
            wrapper.appendChild(title);
        }
        
        const container = document.createElement("div");
        
        if (item.type === 'line') {
            container.classList.add("metadata-line");
        } else if (item.type === 'column') {
            container.classList.add("metadata-column");
        }
        
        if (item.items) {
            await this.renderDisplayItems(container, item.items);
        }
        
        wrapper.appendChild(container);
        return wrapper;
    }

    private async renderTabs(item: any): Promise<HTMLElement> {
        const container = document.createElement("div");
        container.classList.add("metadata-tabs-container");
        
        if (item.className) {
            container.classList.add(item.className);
        }
        
        if (item.title) {
            const title = document.createElement("h3");
            title.textContent = item.title;
            title.classList.add("container-section-title");
            container.appendChild(title);
        }
        
        const tabHeaders = document.createElement("div");
        tabHeaders.classList.add("tab-headers");
        container.appendChild(tabHeaders);
        
        const tabContents = document.createElement("div");
        tabContents.classList.add("tab-contents");
        container.appendChild(tabContents);
        
        if (!item.tabs) return container;
        
        for (let i = 0; i < item.tabs.length; i++) {
            const tabConfig = item.tabs[i];
            
            const tabHeader = document.createElement("button");
            tabHeader.textContent = tabConfig.name;
            tabHeader.classList.add("tab-header");
            if (i === 0) tabHeader.classList.add("active");
            tabHeader.dataset.tabIndex = i.toString();
            tabHeaders.appendChild(tabHeader);
            
            const tabContent = document.createElement("div");
            tabContent.classList.add("tab-content");
            if (i === 0) tabContent.classList.add("active");
            tabContent.dataset.tabIndex = i.toString();
            
            if (tabConfig.items) {
                await this.renderDisplayItems(tabContent, tabConfig.items);
            }
            tabContents.appendChild(tabContent);
            
            tabHeader.addEventListener("click", () => {
                tabHeaders.querySelectorAll(".tab-header").forEach(h => h.classList.remove("active"));
                tabContents.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
                tabHeader.classList.add("active");
                tabContent.classList.add("active");
            });
        }
        
        return container;
    }

    private async renderFold(item: any): Promise<HTMLElement> {
        const container = document.createElement("div");
        container.classList.add("metadata-fold-container");
        
        if (item.className) {
            container.classList.add(item.className);
        }
        
        const foldHeader = document.createElement("div");
        foldHeader.classList.add("fold-header");
        foldHeader.textContent = item.title || "Details";
        container.appendChild(foldHeader);
        
        const foldContent = document.createElement("div");
        foldContent.classList.add("fold-content");
        
        if (item.items) {
            await this.renderDisplayItems(foldContent, item.items);
        }
        
        addFold(foldHeader, foldContent);
        container.appendChild(foldContent);
        
        return container;
    }

    private async renderTable(item: any, currentInstance?: Classe): Promise<HTMLElement> {
        const container = document.createElement("div");
        container.classList.add("metadata-table-container");
        
        if (item.className) {
            container.classList.add(item.className);
        }
        
        if (item.title) {
            const title = document.createElement("h3");
            title.textContent = item.title;
            title.classList.add("container-section-title");
            container.appendChild(title);
        }
        
        if (!item.source) {
            console.warn("Table display item missing source configuration");
            return container;
        }
        
        // Get files based on source filter type
        let files = await this.getFilesForTable(item.source, currentInstance);
        
        const tableConfig = {
            source: item.source,
            columns: item.columns || [],
            totals: item.totals || []
        };
        
        const dynamicTable = new DynamicTable(files, tableConfig, this.vault);
        const tableElement = await dynamicTable.getTable();
        container.appendChild(tableElement);
        
        return container;
    }

    /**
     * Get files for a table based on source configuration
     */
    private async getFilesForTable(source: any, currentInstance?: Classe): Promise<Classe[]> {
        let instances: Classe[] = [];
        
        // Get instances based on filter type
        const factory = this.vault.getDynamicClassFactory();
        if (!factory) {
            console.warn("DynamicClassFactory not available");
            return [];
        }

        const smartFilter = source.smartFilter || 'all';
        
        switch (smartFilter) {
            case 'all':
                instances = await factory.getAllInstancesForClass(source.class, this.vault);
                break;
            
            case 'children':
                if (currentInstance) {
                    instances = await (currentInstance as any).findChildren?.() || [];
                }
                break;
            
            case 'parent':
                if (currentInstance) {
                    const parentFile = await (currentInstance as any).getParentFile?.();
                    if (parentFile) {
                        const parent = await this.vault.getFromFile(parentFile);
                        if (parent) {
                            instances = [parent];
                        }
                    }
                }
                break;
            
            case 'siblings':
                if (currentInstance) {
                    const parentFile = await (currentInstance as any).getParentFile?.();
                    if (parentFile) {
                        const parent = await this.vault.getFromFile(parentFile);
                        if (parent) {
                            const siblings = await (parent as any).findChildren?.() || [];
                            // Exclude current instance
                            const currentPath = currentInstance.getPath();
                            instances = siblings.filter((s: Classe) => s.getPath() !== currentPath);
                        }
                    }
                }
                break;
            
            case 'roots':
                // Get all instances and filter those without parent
                const allInstances = await factory.getAllInstancesForClass(source.class, this.vault);
                instances = [];
                for (const instance of allInstances) {
                    const parentFile = await (instance as any).getParentFile?.();
                    if (!parentFile) {
                        instances.push(instance);
                    }
                }
                break;
            
            default:
                console.warn(`Unknown smartFilter type: ${smartFilter}`);
        }

        // Apply conditions if specified
        if (source.conditions && source.conditions.length > 0) {
            const validationFn = this.vault.conditionManager.createValidationFunction(source.conditions, currentInstance);
            
            const filtered: Classe[] = [];
            for (const instance of instances) {
                if (await validationFn(instance)) {
                    filtered.push(instance);
                }
            }
            instances = filtered;
        }

        return instances;
    }
}
