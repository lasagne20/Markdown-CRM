export type GridItem = {
    content: string | HTMLElement;
    row?: number;
    col?: number;
};

export class GridDisplay {
    private grid: GridItem[][] = [];
    private maxRow = 0;
    private maxCol = 0;

    addRow(items: (string | HTMLElement)[]) {
        const rowIndex = this.maxRow++;
        this.grid[rowIndex] = [];
        items.forEach((content, colIndex) => {
            this.grid[rowIndex][colIndex] = { content, row: rowIndex, col: colIndex };
            if (colIndex + 1 > this.maxCol) this.maxCol = colIndex + 1;
        });
    }

    addColumn(items: (string | HTMLElement)[]) {
        items.forEach((content, rowIndex) => {
            if (!this.grid[rowIndex]) this.grid[rowIndex] = [];
            const colIndex = this.grid[rowIndex].length;
            this.grid[rowIndex][colIndex] = { content, row: rowIndex, col: colIndex };
            if (rowIndex + 1 > this.maxRow) this.maxRow = rowIndex + 1;
            if (colIndex + 1 > this.maxCol) this.maxCol = colIndex + 1;
        });
    }

    getDisplay(): HTMLElement {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.width = '100%';

        const table = document.createElement('table');
        table.style.borderCollapse = 'separate';
        table.style.borderSpacing = '15px';

        for (let r = 0; r < this.maxRow; r++) {
            const tr = document.createElement('tr');
            for (let c = 0; c < this.maxCol; c++) {
                const td = document.createElement('td');
                td.style.padding = '4px';
                const item = this.grid[r]?.[c];
                if (item) {
                    if (typeof item.content === 'string') {
                        td.textContent = item.content;
                    } else {
                        td.appendChild(item.content);
                    }
                }
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }
        container.appendChild(table);
        return container;
    }
    
}