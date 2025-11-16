import { Classe } from '../vault/Classe';
import { Vault } from '../vault/Vault';
import { DisplayContainer } from '../Config/interfaces';

/**
 * DynamicTable - Manages dynamic table rendering with filters, sorting, and totals
 * Extracted from ClassConfigManager for better separation of concerns
 */
export class DynamicTable {
    private table: HTMLTableElement;
    private tableData: {
        files: Classe[];
        columns: any[];
        currentSort: { column: number; ascending: boolean };
        filters: Map<number, string>;
    };
    private config: DisplayContainer;
    private vault: Vault;

    constructor(files: Classe[], config: DisplayContainer, vault: Vault) {
        this.config = config;
        this.vault = vault;
        
        // Ensure _fileName column exists as first column
        const columns = config.columns || [];
        const hasFileNameColumn = columns.some(col => col.propertyName === '_fileName');
        
        if (!hasFileNameColumn && columns.length > 0) {
            // Add _fileName as first column
            columns.unshift({
                name: 'Fichier',
                propertyName: '_fileName',
                filter: 'text',
                sort: true
            });
        }
        
        // Initialize table data
        this.tableData = {
            files,
            columns: columns,
            currentSort: { column: -1, ascending: true },
            filters: new Map()
        };

        // Create table element
        this.table = document.createElement('table');
        this.table.className = 'data-table';

        // Build initial table structure (async initialization)
        this.buildTableStructure();
    }

    /**
     * Get the configured table element
     */
    public getTable(): HTMLTableElement {
        return this.table;
    }

    /**
     * Build the complete table structure (header, filters, body, footer)
     */
    private async buildTableStructure(): Promise<void> {
        // Clear table
        this.table.innerHTML = '';
        
        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        this.config.columns?.forEach((col, index) => {
            const th = document.createElement('th');
            th.textContent = col.name;
            
            if (col.sort !== false) {
                th.classList.add('sortable');
                th.onclick = async () => {
                    await this.sortTable(index);
                };
            }
            
            if (this.tableData.currentSort.column === index) {
                th.classList.add(this.tableData.currentSort.ascending ? 'sorted-asc' : 'sorted-desc');
            }
            
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        
        // Create filter row if needed
        const hasFilters = this.config.columns?.some(col => col.filter !== false);
        if (hasFilters) {
            const filterRow = document.createElement('tr');
            filterRow.className = 'filter-row';
            
            this.config.columns?.forEach((col, index) => {
                const th = document.createElement('th');
                
                if (col.filter !== false) {
                    if (col.filter === 'text') {
                        const input = document.createElement('input');
                        input.type = 'text';
                        input.placeholder = `Filtrer...`;
                        input.value = this.tableData.filters.get(index) || '';
                        input.oninput = () => {
                            this.tableData.filters.set(index, input.value);
                            void this.filterAndRender();
                        };
                        th.appendChild(input);
                    } else if (col.filter === 'select' || col.filter === 'multi-select') {
                        const select = document.createElement('select');
                        select.innerHTML = '<option value="">Tous</option>';
                        
                        // Get unique values - need to be async
                        const uniqueValues = new Set<string>();
                        const propName = col.propertyName || col.name;
                        
                        // Collect unique values asynchronously
                        (async () => {
                            for (const file of this.tableData.files) {
                                let value: string;
                                
                                // Special handling for _fileName
                                if (propName === '_fileName') {
                                    const fileObj = file.getFile ? file.getFile() : null;
                                    if (fileObj && fileObj.getName && typeof fileObj.getName === 'function') {
                                        value = fileObj.getName(false); // false = without .md
                                    } else if (fileObj && (fileObj as any).name) {
                                        value = (fileObj as any).name;
                                    } else if (fileObj && (fileObj as any).basename) {
                                        value = (fileObj as any).basename;
                                    } else {
                                        value = '';
                                    }
                                    // Remove .md extension if still present
                                    value = value.replace(/\.md$/i, '');
                                } else {
                                    // Use getPropertyValue for actual properties
                                    value = await file.getPropertyValue(propName) || '';
                                }
                                
                                if (value) uniqueValues.add(String(value));
                            }
                            
                            // Add options to select
                            uniqueValues.forEach(value => {
                                const option = document.createElement('option');
                                option.value = value;
                                option.textContent = value;
                                select.appendChild(option);
                            });
                        })();
                        
                        select.value = this.tableData.filters.get(index) || '';
                        select.onchange = () => {
                            this.tableData.filters.set(index, select.value);
                            void this.filterAndRender();
                        };
                        th.appendChild(select);
                    }
                }
                
                filterRow.appendChild(th);
            });
            thead.appendChild(filterRow);
        }
        
        this.table.appendChild(thead);
        
        // Create body with filtered data
        await this.renderTableBody();
        
        // Create footer with totals
        if (this.config.totals && this.config.totals.length > 0) {
            await this.renderTableFooter();
        }
    }
    
    /**
     * Render table body with filtering applied
     */
    private async renderTableBody(): Promise<void> {
        // Remove existing tbody
        const existingTbody = this.table.querySelector('tbody');
        if (existingTbody) existingTbody.remove();
        
        const tbody = document.createElement('tbody');
        
        // Filter files - collect values asynchronously for filtering
        const filteredFiles: Classe[] = [];
        
        for (const file of this.tableData.files) {
            let shouldInclude = true;
            
            for (const [colIndex, filterValue] of this.tableData.filters.entries()) {
                if (!filterValue) continue;
                
                const col = this.config.columns![colIndex];
                const propName = col.propertyName || col.name;
                
                // Get cell value
                let cellValue: string;
                if (propName === '_fileName') {
                    // Get filename from File object
                    const fileObj = file.getFile ? file.getFile() : null;
                    if (fileObj && fileObj.getName && typeof fileObj.getName === 'function') {
                        cellValue = String(fileObj.getName(false)).toLowerCase(); // false = without .md
                    } else if (fileObj && (fileObj as any).name) {
                        cellValue = String((fileObj as any).name).toLowerCase();
                    } else if (fileObj && (fileObj as any).basename) {
                        cellValue = String((fileObj as any).basename).toLowerCase();
                    } else {
                        cellValue = '';
                    }
                    // Remove .md extension if still present
                    cellValue = cellValue.replace(/\.md$/i, '');
                } else {
                    // Use getPropertyValue for actual properties
                    const value = await file.getPropertyValue(propName);
                    cellValue = String(value || '').toLowerCase();
                }
                
                const filter = filterValue.toLowerCase();
                
                if (!cellValue.includes(filter)) {
                    shouldInclude = false;
                    break;
                }
            }
            
            if (shouldInclude) {
                filteredFiles.push(file);
            }
        }
        
        // Render rows
        for (const file of filteredFiles) {
            const row = document.createElement('tr');
            
            if (this.config.columns) {
                for (const col of this.config.columns) {
                    const td = document.createElement('td');
                    const propName = col.propertyName || col.name;
                    
                    // Special handling for _fileName property
                    if (propName === '_fileName') {
                        // Try to get the actual file name from the File object
                        let fileName = '-';
                        const fileObj = file.getFile ? file.getFile() : null;
                        
                        if (fileObj && fileObj.getName && typeof fileObj.getName === 'function') {
                            fileName = fileObj.getName(false); // false = without .md extension
                        } else if (fileObj && (fileObj as any).name) {
                            fileName = (fileObj as any).name;
                        } else if (fileObj && (fileObj as any).basename) {
                            fileName = (fileObj as any).basename;
                        } else if ((file as any).basename) {
                            fileName = (file as any).basename;
                        } else if ((file as any).file && (file as any).file.name) {
                            fileName = (file as any).file.name;
                        }
                        
                        // Remove .md extension if present
                        fileName = fileName.replace(/\.md$/i, '');
                        
                        // Create a clickable link to the file
                        const link = document.createElement('a');
                        link.textContent = fileName;
                        link.href = '#';
                        link.className = 'file-link';
                        link.onclick = async (e) => {
                            e.preventDefault();
                            
                            // Use the same navigation method as FileProperty
                            const path = file.getPath();
                            if (path && this.vault?.app?.open) {
                                await this.vault.app.open(path);
                            }
                        };
                        
                        td.appendChild(link);
                    } else {
                        // Get the property object to display its component
                        const property = file.getProperty(propName);
                        if (property) {
                            // Display the property's interactive component
                            const propertyDisplay = await property.getDisplay(file);
                            td.appendChild(propertyDisplay);
                        } else {
                            // Fallback to text value if property not found
                            const value = await file.getPropertyValue(propName);
                            td.textContent = value || '-';
                        }
                    }
                    
                    row.appendChild(td);
                }
            }
            
            tbody.appendChild(row);
        }
        
        this.table.appendChild(tbody);
    }
    
    /**
     * Render table footer with totals
     */
    private async renderTableFooter(): Promise<void> {
        // Remove existing tfoot
        const existingTfoot = this.table.querySelector('tfoot');
        if (existingTfoot) existingTfoot.remove();
        
        const tfoot = document.createElement('tfoot');
        const totalRow = document.createElement('tr');
        
        // Create cells for each column
        if (this.config.columns && this.config.totals) {
            // Build a map of property names to their total configs
            const totalsByProperty = new Map<string, any>();
            let countTotal: any = null;
            
            for (const total of this.config.totals) {
                if (total.formula === 'count') {
                    countTotal = total;
                } else if (total.propertyName) {
                    totalsByProperty.set(total.propertyName, total);
                }
            }
            
            for (let i = 0; i < this.config.columns.length; i++) {
                const td = document.createElement('td');
                const col = this.config.columns[i];
                const propName = col.propertyName || col.name;
                
                // Check if this column has a total
                const total = totalsByProperty.get(propName);
                
                if (i === 0 && countTotal) {
                    // First column: show count label and value
                    td.textContent = `${countTotal.column}: `;
                    td.style.fontWeight = 'bold';
                    
                    const countValue = await this.calculateTotal(countTotal);
                    const span = document.createElement('span');
                    span.textContent = countValue;
                    span.style.fontWeight = 'normal';
                    td.appendChild(span);
                } else if (total) {
                    // This column has a total - show label and value
                    const label = document.createElement('span');
                    label.textContent = `${total.column}: `;
                    label.style.fontWeight = 'bold';
                    td.appendChild(label);
                    
                    const value = await this.calculateTotal(total);
                    const valueSpan = document.createElement('span');
                    valueSpan.textContent = value;
                    td.appendChild(valueSpan);
                }
                // Other cells remain empty
                
                totalRow.appendChild(td);
            }
        }
        
        tfoot.appendChild(totalRow);
        this.table.appendChild(tfoot);
    }
    
    /**
     * Calculate total value based on formula
     */
    private async calculateTotal(total: any): Promise<string> {
        if (total.formula === 'count') {
            // Count filtered rows
            const tbody = this.table.querySelector('tbody');
            const rowCount = tbody?.querySelectorAll('tr').length || 0;
            return `${rowCount}`;
        }
        
        if (!total.propertyName) {
            return '-';
        }
        
        // Collect all values for the property
        const values: number[] = [];
        for (const file of this.tableData.files) {
            const value = await file.getPropertyValue(total.propertyName);
            const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
            if (!isNaN(numValue)) {
                values.push(numValue);
            }
        }
        
        if (values.length === 0) {
            return '0';
        }
        
        let result: number = 0;
        
        switch (total.formula) {
            case 'sum':
                result = values.reduce((sum, val) => sum + val, 0);
                break;
            case 'average':
            case 'avg':
                result = values.reduce((sum, val) => sum + val, 0) / values.length;
                break;
            case 'min':
                result = Math.min(...values);
                break;
            case 'max':
                result = Math.max(...values);
                break;
            default:
                return '-';
        }
        
        // Format the result
        const propName = total.propertyName.toLowerCase();
        if (propName.includes('budget') || propName.includes('prix') || propName.includes('cost') || propName.includes('montant')) {
            return result.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
        } else {
            return result.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
        }
    }
    
    /**
     * Sort table by column index
     */
    private async sortTable(columnIndex: number): Promise<void> {
        // Toggle sort direction
        if (this.tableData.currentSort.column === columnIndex) {
            this.tableData.currentSort.ascending = !this.tableData.currentSort.ascending;
        } else {
            this.tableData.currentSort.column = columnIndex;
            this.tableData.currentSort.ascending = true;
        }
        
        // Sort files - collect values asynchronously
        const col = this.config.columns![columnIndex];
        const propName = col.propertyName || col.name;
        
        // Collect values for all files
        const fileValues: Array<{ file: Classe, value: string }> = [];
        
        for (const file of this.tableData.files) {
            let value: string;
            
            // Special handling for _fileName
            if (propName === '_fileName') {
                const fileObj = file.getFile ? file.getFile() : null;
                if (fileObj && fileObj.getName && typeof fileObj.getName === 'function') {
                    value = fileObj.getName(false); // false = without .md
                } else if (fileObj && (fileObj as any).name) {
                    value = (fileObj as any).name;
                } else if (fileObj && (fileObj as any).basename) {
                    value = (fileObj as any).basename;
                } else {
                    value = '';
                }
                // Remove .md extension if still present
                value = value.replace(/\.md$/i, '');
            } else {
                // Use getPropertyValue for actual properties
                const propValue = await file.getPropertyValue(propName);
                value = String(propValue || '');
            }
            
            fileValues.push({ file, value });
        }
        
        // Sort by collected values
        fileValues.sort((a, b) => {
            const comparison = a.value.localeCompare(b.value);
            return this.tableData.currentSort.ascending ? comparison : -comparison;
        });
        
        // Update files array with sorted order
        this.tableData.files = fileValues.map(fv => fv.file);
        
        // Rebuild table
        void this.buildTableStructure();
    }
    
    /**
     * Re-render table with current filters applied
     */
    private async filterAndRender(): Promise<void> {
        await this.renderTableBody();
        
        // Update footer if exists
        if (this.config.totals && this.config.totals.length > 0) {
            await this.renderTableFooter();
        }
    }
}
