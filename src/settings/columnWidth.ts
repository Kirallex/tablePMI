import { ColumnWidthCard } from "./settings";

export function applyColumnWidthsFromSettings(
    table: HTMLTableElement,
    columnWidthCard: ColumnWidthCard
): void {
    if (!table || !columnWidthCard) {
        console.warn("applyColumnWidthsFromSettings: table or columnWidthCard is null");
        return;
    }

    const colCount = columnWidthCard.getColumnCount();

    for (let colIdx = 0; colIdx < colCount; colIdx++) {
        const width = columnWidthCard.getColumnWidth(colIdx);
        if (!width || width <= 0) continue;

        // Одна и та же колонка встречается в thead и во всех tbody-строках,
        // включая totalRow — селектор по data-col-index собирает всё разом.
        const cells = table.querySelectorAll(`[data-col-index="${colIdx}"]`);
        cells.forEach(cell => {
            const htmlCell = cell as HTMLElement;
            htmlCell.style.setProperty('width',     `${width}px`, 'important');
            htmlCell.style.setProperty('min-width', `${width}px`, 'important');
            htmlCell.style.setProperty('max-width', `${width}px`, 'important');
        });
    }
}