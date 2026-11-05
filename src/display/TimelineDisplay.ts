/**
 * TimelineDisplay : fusionne en une seule table chronologique les entrées
 * d'une ObjectProperty (journal manuel) et des instances dérivées
 * (ex: les actions réalisées d'une institution).
 *
 * - Les entrées de la propriété restent éditables : mêmes cellules
 *   (fillDisplay + updateObject) et boutons (ajout/suppression) que le rendu
 *   standard "table" de l'ObjectProperty
 * - Les lignes dérivées sont en lecture seule : les données sont dérivées de
 *   leurs fichiers sources, jamais copiées dans la propriété, donc toujours
 *   synchrones (une action qui change de date ou d'état se reflète seule)
 * - Tri : desc (plus récent en premier) par défaut, asc configurable ; les
 *   entrées sans date restent en fin de timeline
 */

export interface TimelineActionConfig {
    /** Source des instances dérivées (source de table : class/smartFilter/conditions/groups) */
    source: any;
    /** Propriété de l'instance portant la date de chronologie (défaut : "date") */
    date?: string;
    /** Valeur affichée dans la colonne type (défaut : "Action") */
    typeLabel?: string;
}

export interface TimelineItem {
    type: 'timeline';
    title?: string;
    /** Nom de l'ObjectProperty dont les entries forment le journal manuel */
    property: string;
    /** Sens du tri chronologique : desc (défaut) ou asc */
    sort?: 'asc' | 'desc';
    /** Instances dérivées fusionnées dans la timeline */
    actions?: TimelineActionConfig;
}

interface TimelineRow {
    date: string | null;
    element: HTMLTableRowElement;
    isAction: boolean;
}

export class TimelineDisplay {
    constructor(
        private objectProperty: any,
        private vault: any,
        private context: any,
        private resolveSource: (source: any, currentInstance?: any) => Promise<any[]>
    ) {}

    /**
     * Construit la table fusionnée.
     * @param item            Configuration du timeline item
     * @param values          Entries actuelles de l'ObjectProperty
     * @param update          Callback d'écriture de la propriété
     * @param actionInstances Instances dérivées déjà résolues ; si absent,
     *                        elles sont résolues ici via resolveSource
     */
    async render(
        item: TimelineItem,
        values: any[],
        update: (value: any) => Promise<void>,
        actionInstances?: any[] | null
    ): Promise<HTMLElement> {
        const subProperties: any[] = Object.values(this.objectProperty.properties ?? {});

        let instances = actionInstances ?? null;
        if (!instances && item.actions) {
            instances = await this.resolveSource(item.actions.source, this.context);
        }

        // Pré-calcul des dates des instances dérivées (une lecture par instance)
        const actionDates: (string | null)[] = [];
        const dateProperty = item.actions?.date ?? 'date';
        for (const instance of instances ?? []) {
            try {
                actionDates.push((await instance.getValue?.(dateProperty)) ?? null);
            } catch {
                actionDates.push(null);
            }
        }

        const container = document.createElement('div');
        container.classList.add('metadata-timeline-container');

        const tableWrapper = document.createElement('div');
        tableWrapper.style.position = 'relative';
        container.appendChild(tableWrapper);

        // Bouton d'ajout de l'ObjectProperty : le journal manuel reste
        // enrichissable depuis la timeline
        const addButton = this.objectProperty.createAddButton(values, update, container);
        addButton.style.position = 'absolute';
        addButton.style.top = '0';
        addButton.style.right = '0';
        tableWrapper.appendChild(addButton);

        const table = document.createElement('table');
        table.classList.add('metadata-object-table');
        tableWrapper.appendChild(table);

        // En-tête : les sous-propriétés de l'ObjectProperty + colonne suppression
        const headerRow = document.createElement('tr');
        for (const property of subProperties) {
            const th = document.createElement('th');
            th.textContent = property.title || property.name;
            headerRow.appendChild(th);
        }
        headerRow.appendChild(document.createElement('th'));
        table.appendChild(headerRow);

        // Lignes manuelles : identiques au rendu "table" de l'ObjectProperty
        const rows: TimelineRow[] = [];
        (values ?? []).forEach((entry: any, index: number) => {
            const row = document.createElement('tr');
            for (const property of subProperties) {
                const td = document.createElement('td');
                td.appendChild(property.fillDisplay(
                    entry?.[property.name],
                    async (value: any) => await this.objectProperty.updateObject(values, update, index, property, value)
                ));
                row.appendChild(td);
            }
            const tdDelete = document.createElement('td');
            tdDelete.classList.add('metadata-object-delete-cell');
            const deleteButton = this.objectProperty.createDeleteButton(values, update, index, container);
            deleteButton.classList.add('metadata-object-delete-button');
            tdDelete.appendChild(deleteButton);
            row.appendChild(tdDelete);
            rows.push({ date: entry?.date ?? null, element: row, isAction: false });
        });

        // Lignes dérivées : lecture seule, triées au même format
        const typeLabel = item.actions?.typeLabel ?? 'Action';
        (instances ?? []).forEach((instance: any, index: number) => {
            const row = document.createElement('tr');
            row.classList.add('timeline-action-row');
            for (const property of subProperties) {
                const td = document.createElement('td');
                if (property.name === (item.actions?.date ?? 'date')) {
                    td.textContent = actionDates[index] ?? '';
                } else if (property.name === 'type') {
                    td.textContent = typeLabel;
                } else if (property.name === 'description') {
                    td.appendChild(this.createFileLink(instance));
                }
                row.appendChild(td);
            }
            // Cellule suppression vide : une ligne dérivée ne se supprime pas
            row.appendChild(document.createElement('td'));
            rows.push({ date: actionDates[index], element: row, isAction: true });
        });

        // Fusion chronologique : les entrées sans date restent en fin
        const asc = item.sort === 'asc';
        const compare = (a: TimelineRow, b: TimelineRow) => {
            if (a.date === null && b.date === null) { return 0; }
            if (a.date === null) { return 1; }
            if (b.date === null) { return -1; }
            return asc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
        };
        rows.sort(compare).forEach((row) => table.appendChild(row.element));

        return container;
    }

    /**
     * Lien cliquable vers le fichier d'une instance dérivée (même mécanique
     * que la colonne _fileName de DynamicTable).
     */
    private createFileLink(instance: any): HTMLElement {
        const link = document.createElement('a');
        const path = instance.getPath?.() ?? '';
        link.textContent = instance.getName?.() ?? path;
        link.href = '#';
        link.className = 'file-link';
        link.onclick = async (e) => {
            e.preventDefault();
            if (path && this.vault?.app?.open) {
                await this.vault.app.open(path);
            }
        };
        return link;
    }
}
