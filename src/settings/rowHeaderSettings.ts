import { VisualSettings } from "./settings";

export function applyRowHeadersSettings(container: HTMLElement, settings: VisualSettings): void {
    const table = container.querySelector('table');
    if (!table) return;
    const rowHeaders = settings.rowHeaders?.rowHeadersGroup;
    if (!rowHeaders) return;

    const rowHeaderCells = table.querySelectorAll('tbody tr.midRow th.formatRowNodes, tbody tr.totalRow th.formatRowNodes');
    if (rowHeaderCells.length === 0) return;

    // Шрифтовые настройки
    const fontFamily = rowHeaders.font.fontFamily.value;
    const fontSize = rowHeaders.font.fontSize.value;
    const isBold = rowHeaders.font?.bold?.value;
    const isItalic = rowHeaders.font?.italic?.value;
    const isUnderline = rowHeaders.font?.underline?.value;

    rowHeaderCells.forEach(cell => {
        const htmlCell = cell as HTMLElement;
        htmlCell.style.setProperty('font-family', fontFamily, 'important');
        htmlCell.style.setProperty('font-size', `${fontSize}px`, 'important');
        htmlCell.style.setProperty('font-weight', isBold ? 'bold' : 'normal', 'important');
        htmlCell.style.setProperty('font-style', isItalic ? 'italic' : 'normal', 'important');
        htmlCell.style.setProperty('text-decoration', isUnderline ? 'underline' : 'none', 'important');
    });

    // Цвета
    const branded = rowHeaders.brandedRowColor.value;
    if (branded) {
        // Используем цвета из ValuesGroup с учётом чётности строк
        const values = settings.values?.valuesGroup;
        const rows = table.querySelectorAll('tbody tr');
        const rowIndexMap = new Map<HTMLElement, number>();
        rows.forEach((row, index) => {
            rowIndexMap.set(row as HTMLElement, index);
        });

        rowHeaderCells.forEach(cell => {
            const htmlCell = cell as HTMLElement;
            const parentRow = cell.closest('tr') as HTMLElement;
            const rowIndex = rowIndexMap.get(parentRow);
            if (rowIndex !== undefined && values) {
                const isOddRow = (rowIndex % 2 === 0);
                const textColor = isOddRow ? values.textColor.value.value : values.altTextColor.value.value;
                const bgColor = isOddRow ? values.backgroundColor.value.value : values.altBackgroundColor.value.value;
                htmlCell.style.setProperty('color', textColor, 'important');
                htmlCell.style.setProperty('background-color', bgColor, 'important');
            }
        });
    } else {
        const textColor = rowHeaders.textColor.value.value;
        const bgColor = rowHeaders.backgroundColor.value.value;
        rowHeaderCells.forEach(cell => {
            const htmlCell = cell as HTMLElement;
            htmlCell.style.setProperty('color', textColor, 'important');
            htmlCell.style.setProperty('background-color', bgColor, 'important');
        });
    }

    // Выравнивание текста
    const alignment = rowHeaders.textAlignment.value;
    rowHeaderCells.forEach(cell => {
        const textSpan = cell.querySelector('.row-header-text') as HTMLElement;
        if (textSpan) {
            textSpan.style.setProperty('text-align', alignment, 'important');
        }
    });
}
