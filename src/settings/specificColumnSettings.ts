// specificColumnSettings.ts
import { IMeasureSettings } from "./measureSettings";

export function applySpecificColumnSettings(
    container: HTMLElement,
    settings: IMeasureSettings,
    measureKey: string,
    measureName: string
): void {
    // console.log(`[applySpecificColumnSettings] Called for measure: "${measureName}"`);
    // console.log("Settings:", JSON.stringify(settings, null, 2));

    const table = container.querySelector('table');
    if (!table) {
        console.warn("Table not found in container");
        return;
    }

   //const headerRow = table.querySelector('thead tr:last-child');
    const headerRows = table.querySelectorAll('thead tr');
    const headerRow = headerRows.length ? headerRows[headerRows.length - 1] : null;
    if (!headerRow) {
        console.warn("Header row (thead tr:last-child) not found");
        return;
    }

    // Все ячейки заголовков, исключая первый столбец (строки)
    const headerCells = Array.from(headerRow.querySelectorAll('th')).slice(1);
    // console.log(`Header cells count: ${headerCells.length}`);
    headerCells.forEach((cell, idx) => {
        // console.log(`  cell ${idx} text: "${cell.textContent?.trim()}"`);
    });

    const columnIndices: number[] = [];
    headerCells.forEach((cell, idx) => {
        const cellText = cell.textContent?.trim() || '';
        if (cellText === measureName) {
            columnIndices.push(idx + 1); // +1 из-за пропущенного первого столбца
            // console.log(`  -> Match at index ${idx} (real column ${idx + 1})`);
        }
    });

    if (columnIndices.length === 0) {
        console.warn(`No columns found for measure "${measureName}"`);
        return;
    }

    // console.log(`Applying styles to columns: ${columnIndices.join(', ')}`);

    const applyStyles = (cell: HTMLElement, part: { textColor: string; backgroundColor: string; alignment: string }, partName: string) => {
    const currentStyle = cell.getAttribute('style') || '';
    const newStyle = `${currentStyle}; color: ${part.textColor} !important; background-color: ${part.backgroundColor} !important; text-align: ${part.alignment} !important;`;
    cell.setAttribute('style', newStyle);
    // console.log(`  ${partName} style attribute updated to:`, newStyle);
    };

    columnIndices.forEach(colIndex => {
        // 1. Заголовок (Header)
        if (settings.header) {
            const headerCell = headerRow.children[colIndex] as HTMLElement;
            if (headerCell) {
                applyStyles(headerCell, settings.header, "Header");
            } else {
                console.warn(`Header cell at colIndex ${colIndex} not found`);
            }
        }

        // 2. Значения (Values) – строки с классом midRow
        if (settings.values) {
            const dataRows = table.querySelectorAll('tbody tr.midRow');
            // console.log(`  Found ${dataRows.length} midRow rows for Values`);
            dataRows.forEach((row, rowIdx) => {
                const cell = (row as HTMLTableRowElement).cells[colIndex];
                if (cell) {
                    applyStyles(cell as HTMLElement, settings.values, `Values (row ${rowIdx})`);
                }
            });
        }

        // 3. Итоги (Total) – строки с классом totalRow
        if (settings.total) {
            const totalRows = table.querySelectorAll('tbody tr.totalRow');
            // console.log(`  Found ${totalRows.length} totalRow rows for Total`);
            totalRows.forEach((row, rowIdx) => {
                const cell = (row as HTMLTableRowElement).cells[colIndex];
                if (cell) {
                    applyStyles(cell as HTMLElement, settings.total, `Total (row ${rowIdx})`);
                }
            });
        }
    });
}
