import { VisualSettings } from "./settings";

export function applyRowGrandTotalSettings(container: HTMLElement, settings: VisualSettings): void {
    const table = container.querySelector('table');
    if (!table) return;
    const grandTotalSettings = settings.rowGrandTotal?.rowGrandTotalGroup;
    if (!grandTotalSettings) return;

    const grandTotalRow = table.querySelector('tbody tr.totalRow[data-level="0"]');
    if (!grandTotalRow) return;

    const fontFamily = grandTotalSettings.font.fontFamily.value;
    const fontSize = grandTotalSettings.font.fontSize.value;
    const isBold = grandTotalSettings.font?.bold?.value;
    const isItalic = grandTotalSettings.font?.italic?.value;
    const isUnderline = grandTotalSettings.font?.underline?.value;
    const applyToLabels = grandTotalSettings.applyToLabels.value;
    const textColor = grandTotalSettings.textColor.value.value;
    const bgColor = grandTotalSettings.backgroundColor.value.value;

    const styleCell = (cell: HTMLElement): void => {
        cell.style.setProperty('font-family', fontFamily, 'important');
        cell.style.setProperty('font-size', `${fontSize}px`, 'important');
        cell.style.setProperty('font-weight', isBold ? 'bold' : 'normal', 'important');
        cell.style.setProperty('font-style', isItalic ? 'italic' : 'normal', 'important');
        cell.style.setProperty('text-decoration', isUnderline ? 'underline' : 'none', 'important');
        cell.style.setProperty('color', textColor, 'important');
        cell.style.setProperty('background-color', bgColor, 'important');
    };

    // --- Данные (td) ---
    const dataCells = grandTotalRow.querySelectorAll('td');
    dataCells.forEach(cell => styleCell(cell as HTMLElement));

    // --- Заголовки (th) — ВСЕ, а не только первый ---
    if (applyToLabels) {
        const labelCells = grandTotalRow.querySelectorAll('th.formatRowNodes');
        labelCells.forEach(cell => styleCell(cell as HTMLElement));
    }
}