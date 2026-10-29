import { VisualSettings } from "./settings";

export function applyValuesSettings(container: HTMLElement, settings: VisualSettings): void {
    const table = container.querySelector('table');
    if (!table) return;
    const values = settings.values.valuesGroup;

    // --- Шрифтовые настройки только для ячеек данных (td) ---
    const dataCells = table.querySelectorAll('tbody td');
    if (dataCells.length > 0) {
        const fontFamily = values.font.fontFamily.value;
        const fontSize = values.font.fontSize.value;
        const isBold = values.font?.bold?.value;
        const isItalic = values.font?.italic?.value;
        const isUnderline = values.font?.underline?.value;

        dataCells.forEach(cell => {
            const htmlCell = cell as HTMLElement;
            htmlCell.style.setProperty('font-family', fontFamily, 'important');
            htmlCell.style.setProperty('font-size', `${fontSize}px`, 'important');
            htmlCell.style.setProperty('font-weight', isBold ? 'bold' : 'normal', 'important');
            htmlCell.style.setProperty('font-style', isItalic ? 'italic' : 'normal', 'important');
            htmlCell.style.setProperty('text-decoration', isUnderline ? 'underline' : 'none', 'important');
        });
    }

    // --- Цвета для всех ячеек строк (и th, и td) по чётности ---
    const rows = table.querySelectorAll('tbody tr');
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td, th');
        const isOddRow = (i % 2 === 0);
        const textColor = isOddRow ? values.textColor.value.value : values.altTextColor.value.value;
        const bgColor = isOddRow ? values.backgroundColor.value.value : values.altBackgroundColor.value.value;

        cells.forEach(cell => {
            const htmlCell = cell as HTMLElement;
            htmlCell.style.setProperty('color', textColor, 'important');
            htmlCell.style.setProperty('background-color', bgColor, 'important');
        });
    }
}
