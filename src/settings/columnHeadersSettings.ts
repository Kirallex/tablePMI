import { VisualSettings } from "./settings";

export function applyColumnHeadersSettings(container: HTMLElement, settings: VisualSettings): void {
    const table = container.querySelector('table');
    if (!table) return;
    const headers = settings.columnHeaders.columnHeadersGroup;


    // Находим все th внутри thead
    const headerCells = table.querySelectorAll('thead th');
    if (headerCells.length === 0) return;

    // Применяем шрифтовые настройки ко всем заголовкам
    const fontFamily = headers.font.fontFamily.value;
    const fontSize = headers.font.fontSize.value;
    const isBold = headers.font?.bold?.value;
    const isItalic = headers.font?.italic?.value;
    const isUnderline = headers.font?.underline?.value;

    headerCells.forEach(cell => {
        const htmlCell = cell as HTMLElement;
        htmlCell.style.setProperty('font-family', fontFamily, 'important');
        htmlCell.style.setProperty('font-size', `${fontSize}px`, 'important');
        htmlCell.style.setProperty('font-weight', isBold ? 'bold' : 'normal', 'important');
        htmlCell.style.setProperty('font-style', isItalic ? 'italic' : 'normal', 'important');
        htmlCell.style.setProperty('text-decoration', isUnderline ? 'underline' : 'none', 'important');
    });

    // Применяем цвета ко всем заголовкам
    const textColor = headers.textColor.value.value;
    const bgColor = headers.backgroundColor.value.value;
    headerCells.forEach(cell => {
        const htmlCell = cell as HTMLElement;
        htmlCell.style.setProperty('color', textColor, 'important');
        htmlCell.style.setProperty('background-color', bgColor, 'important');
    });

    // Применяем выравнивание для заголовков строк (th.rowsHeader)
    const rowHeaderCells = table.querySelectorAll('thead th.rowsHeader');
    const headerAlignment = headers.headerAlignment.value; // "left", "center", "right"
    if (rowHeaderCells.length > 0) {
        rowHeaderCells.forEach(cell => {
            (cell as HTMLElement).style.setProperty('text-align', headerAlignment, 'important');
        });
    }

    // Применяем выравнивание для заголовков данных (th.formatColumnNodes)
    const columnHeaderCells = table.querySelectorAll('thead th.formatColumnNodes');
    const titleAlignment = headers.titleAlignment.value; // "left", "center", "right"
    if (columnHeaderCells.length > 0) {
        columnHeaderCells.forEach(cell => {
            (cell as HTMLElement).style.setProperty('text-align', titleAlignment, 'important');
        });
    }
}
