import { VisualSettings } from "./settings";

export function applyGridSettings(container: HTMLElement, settings: VisualSettings): void {
    const table = container.querySelector('table');
    if (!table) return;
    const grid = settings.grid;

    const rows = table.rows;
    const totalRows = rows.length;
    if (totalRows === 0) return;

    // Горизонтальные линии
    const hColor = grid.horizontalGroup.color.value.value;
    const hWidth = grid.horizontalGroup.width.value;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowClass = row.className;
        const levelAttr = row.getAttribute('data-level');
        let applyHorizontal = false;

        if (rowClass.includes('midRow')) {
            applyHorizontal = true;
        } else if (rowClass.includes('topRow')) {
            const levelNum = parseInt(levelAttr, 10);
            if (!isNaN(levelNum) && levelNum % 2 === 1) {
                applyHorizontal = true;
            }
        }

        if (applyHorizontal) {
            for (let j = 0; j < row.cells.length; j++) {
                const cell = row.cells[j] as HTMLElement;
                cell.style.borderBottom = `${hWidth}px solid ${hColor}`;
            }
        }
    }

    // Вертикальные линии (всегда)
    const vColor = grid.verticalGroup.color.value.value;
    const vWidth = grid.verticalGroup.width.value;
    for (let i = 0; i < rows.length; i++) {
        for (let j = 0; j < rows[i].cells.length; j++) {
            const cell = rows[i].cells[j] as HTMLElement;
            cell.style.borderRight = `${vWidth}px solid ${vColor}`;
        }
    }

    // Row padding
    const rowPadding = grid.optionsGroup.rowPadding.value;
    if (rowPadding !== undefined) {
        for (let i = 0; i < rows.length; i++) {
            for (let j = 0; j < rows[i].cells.length; j++) {
                const cell = rows[i].cells[j] as HTMLElement;
                cell.style.paddingTop = rowPadding + 'px';
                cell.style.paddingBottom = rowPadding + 'px';
            }
        }
    }
}
