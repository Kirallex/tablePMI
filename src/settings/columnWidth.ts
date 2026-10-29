// columnWidth.ts
import { ColumnWidthCard } from "./settings";

export function applyColumnWidthsFromSettings(
    table: HTMLTableElement,
    columnWidthCard: ColumnWidthCard,
    measureNames: string[]
): void {
    if (!table || !columnWidthCard) {
        console.warn("applyColumnWidthsFromSettings: table or columnWidthCard is null");
        return;
    }

    // 1. Row header width
    const rowHeaderWidth = columnWidthCard.getRowHeaderWidth();
    //console.log(`[ColumnWidth] Row header width from settings: ${rowHeaderWidth}`);
    if (rowHeaderWidth && rowHeaderWidth > 0) {
        const firstColCells = table.querySelectorAll('tr > *:first-child');
        //console.log(`[ColumnWidth] Applying row header width to ${firstColCells.length} cells`);
        firstColCells.forEach(cell => {
            const htmlCell = cell as HTMLElement;
            htmlCell.style.setProperty('width', `${rowHeaderWidth}px`, 'important');
            htmlCell.style.setProperty('min-width', `${rowHeaderWidth}px`, 'important');
            htmlCell.style.setProperty('max-width', `${rowHeaderWidth}px`, 'important');
        });
    }

    // 2. Find header row (last row in thead)
    //const headerRow = table.querySelector('thead tr:last-child');
    const headerRows = table.querySelectorAll('thead tr');
    const headerRow = headerRows.length ? headerRows[headerRows.length - 1] : null;
    if (!headerRow) {
        console.warn("[ColumnWidth] No header row found (thead tr:last-child)");
        return;
    }

    const headerCells = Array.from(headerRow.querySelectorAll('th')).slice(1); // skip first column
    // console.log(`[ColumnWidth] Header cells count: ${headerCells.length}`);
    // console.log("[ColumnWidth] Header texts:", headerCells.map(cell => cell.textContent?.trim()));
    // console.log("[ColumnWidth] Measure names from data:", measureNames);

    // Build map: measure index -> array of column indices (1-based)
    const measureColumnMap = new Map<number, number[]>();
    for (let i = 0; i < measureNames.length; i++) {
        const measureName = measureNames[i];
        const indices: number[] = [];
        headerCells.forEach((cell, idx) => {
            const cellText = cell.textContent?.trim() || '';
            if (cellText === measureName) {
                indices.push(idx + 1); // +1 because we skipped first column
            }
        });
        if (indices.length > 0) {
            measureColumnMap.set(i, indices);
           // console.log(`[ColumnWidth] Measure "${measureName}" (index ${i}) -> columns ${indices.join(',')}`);
        } else {
            console.warn(`[ColumnWidth] No columns found for measure "${measureName}"`);
        }
    }

    // 3. Apply widths for each measure column
    for (const [measureIdx, columnIndices] of measureColumnMap.entries()) {
        const widthValue = columnWidthCard.getMeasureWidth(measureIdx);
        //console.log(`[ColumnWidth] Measure ${measureIdx} width value: ${widthValue}`);
        if (!widthValue || widthValue <= 0) {
            //console.warn(`[ColumnWidth] Skipping measure ${measureIdx} because width is ${widthValue}`);
            continue;
        }

        columnIndices.forEach(colIndex => {
            // Iterate all rows in the table (including thead and tbody)
            for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex++) {
                const row = table.rows[rowIndex];
                const cell = row.cells[colIndex];
                if (cell) {
                    cell.style.width = widthValue + 'px';
                    cell.style.minWidth = widthValue + 'px';
                    cell.style.maxWidth = widthValue + 'px';
                    //Optionally add !important if overridden by other styles:
                    cell.style.setProperty('width', widthValue + 'px', 'important');
                    cell.style.setProperty('min-width', widthValue + 'px', 'important');
                    cell.style.setProperty('max-width', widthValue + 'px', 'important');
                }
            }
        });
    }
}
