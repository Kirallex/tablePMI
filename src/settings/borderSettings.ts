import { VisualSettings } from "./settings";

export function applyBorderSettings(container: HTMLElement, settings: VisualSettings): void {
    const table = container.querySelector('table');
    if (!table) return;
    const borders = settings.borders;
    if (!borders) return;

    const rows = table.rows;
    const totalRows = rows.length;
    if (totalRows === 0) return;

    // --- Подготовка данных, как в старом gridSettings.ts ---
    // Строки заголовков (все строки thead)
    const headerRows = Array.from(table.querySelectorAll('thead tr'));
    const columnHeaderIndices = headerRows.map(tr => {
        for (let i = 0; i < rows.length; i++) {
            if (rows[i] === tr) return i;
        }
        return -1;
    }).filter(i => i >= 0);

    // Уровни заголовков
    const headerLevels = columnHeaderIndices.map(idx => {
        const levelAttr = rows[idx].getAttribute('data-level');
        return levelAttr ? parseInt(levelAttr, 10) : 0;
    });
    const maxHeaderLevel = headerLevels.length ? Math.max(...headerLevels) : 0;

    // Первая midRow и totalRow
    let firstMidRowIdx = -1;
    let totalRowIdx = -1;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.classList.contains('midRow') && firstMidRowIdx === -1) firstMidRowIdx = i;
        if (row.classList.contains('totalRow')) totalRowIdx = i;
    }

    // --- Сброс всех границ ---
    for (let i = 0; i < rows.length; i++) {
        for (let j = 0; j < rows[i].cells.length; j++) {
            const cell = rows[i].cells[j] as HTMLElement;
            cell.style.borderTop = '';
            cell.style.borderBottom = '';
            cell.style.borderLeft = '';
            cell.style.borderRight = '';
        }
    }

    // --- Вспомогательная функция для применения одной секции ---
    // (копирует логику из старого applyBorderToCell для конкретной секции)
    const applySection = (
        section: any,
        cell: HTMLElement,
        rowIdx: number,
        colIdx: number,
        isColumnHeader: boolean,
        isRowHeader: boolean,
        isValues: boolean
    ) => {
        if (!section) return;
        const top = section.positionTop.value;
        const bottom = section.positionBottom.value;
        const left = section.positionLeft.value;
        const right = section.positionRight.value;
        const color = section.color.value.value;
        const width = section.width.value;
        if (width === 0) return;

        // Определяем, какая секция сейчас обрабатывается (по объекту)
        const isAll = (section === borders.allGroup);
        const isColHeader = (section === borders.columnHeaderGroup);
        const isRowHeaderSec = (section === borders.rowHeaderGroup);
        const isValuesSec = (section === borders.valuesGroup);

        // --- Логика для All (полностью как в старом case 'all') ---
        if (isAll) {
            if (top && rowIdx === 0) cell.style.setProperty('border-top', `${width}px solid ${color}`, 'important');
            if (bottom && rowIdx === totalRows - 1) cell.style.setProperty('border-bottom', `${width}px solid ${color}`, 'important');
            if (left && colIdx === 0) cell.style.setProperty('border-left', `${width}px solid ${color}`, 'important');
            if (right && colIdx === rows[rowIdx].cells.length - 1) cell.style.setProperty('border-right', `${width}px solid ${color}`, 'important');
            return;
        }

        // --- Логика для Column Header (как в старом case 'columnHeader') ---
        if (isColHeader && isColumnHeader) {
            if (left && colIdx === 0) cell.style.setProperty('border-left', `${width}px solid ${color}`, 'important');
            if (right && colIdx === rows[rowIdx].cells.length - 1) cell.style.setProperty('border-right', `${width}px solid ${color}`, 'important');
            const levelAttr = rows[rowIdx].getAttribute('data-level');
            const level = levelAttr ? parseInt(levelAttr, 10) : 0;
            if (bottom && level === 0) cell.style.setProperty('border-bottom', `${width}px solid ${color}`, 'important');
            if (top && level === maxHeaderLevel) cell.style.setProperty('border-top', `${width}px solid ${color}`, 'important');
            return;
        }

        // --- Логика для Row Header (как в старом case 'rowHeader') ---
        if (isRowHeaderSec && isRowHeader) {
            // Применяем только к первому столбцу и только к midRow / totalRow
            if (colIdx !== 0) return;
            const row = rows[rowIdx];
            const isMidRow = row.classList.contains('midRow');
            const isTotalRow = row.classList.contains('totalRow');
            if (!isMidRow && !isTotalRow) return;

            if (left) cell.style.setProperty('border-left', `${width}px solid ${color}`, 'important');
            if (right) cell.style.setProperty('border-right', `${width}px solid ${color}`, 'important');
            if (top && isMidRow && rowIdx === firstMidRowIdx) cell.style.setProperty('border-top', `${width}px solid ${color}`, 'important');
            if (bottom && isTotalRow && rowIdx === totalRowIdx) cell.style.setProperty('border-bottom', `${width}px solid ${color}`, 'important');
            return;
        }

        // --- Логика для Values (как в старом case 'values') ---
        if (isValuesSec && isValues) {
            if (cell.tagName !== 'TD') return;
            const row = rows[rowIdx];
            const isMidRow = row.classList.contains('midRow');
            const isTotalRow = row.classList.contains('totalRow');
            if (!isMidRow && !isTotalRow) return;

            if (left && colIdx === 1) cell.style.setProperty('border-left', `${width}px solid ${color}`, 'important');
            if (right && colIdx === rows[rowIdx].cells.length - 1) cell.style.setProperty('border-right', `${width}px solid ${color}`, 'important');
            if (top && isMidRow && rowIdx === firstMidRowIdx) cell.style.setProperty('border-top', `${width}px solid ${color}`, 'important');
            if (bottom && isTotalRow && rowIdx === totalRowIdx) cell.style.setProperty('border-bottom', `${width}px solid ${color}`, 'important');
            return;
        }
    };

    // --- Основной цикл по всем ячейкам: применяем все четыре секции ---
    for (let i = 0; i < rows.length; i++) {
        const isColumnHeader = columnHeaderIndices.includes(i);
        for (let j = 0; j < rows[i].cells.length; j++) {
            const cell = rows[i].cells[j] as HTMLElement;
            const isRowHeader = (j === 0);
            const isValues = !isColumnHeader && !isRowHeader;

            applySection(borders.allGroup, cell, i, j, isColumnHeader, isRowHeader, isValues);
            applySection(borders.columnHeaderGroup, cell, i, j, isColumnHeader, isRowHeader, isValues);
            applySection(borders.rowHeaderGroup, cell, i, j, isColumnHeader, isRowHeader, isValues);
            applySection(borders.valuesGroup, cell, i, j, isColumnHeader, isRowHeader, isValues);
        }
    }

    // --- Дополнительные границы, которые были в старом case 'all' после цикла ---
    const allGroup = borders.allGroup;
    if (allGroup && allGroup.width.value > 0) {
        const color = allGroup.color.value.value;
        const width = allGroup.width.value;

        // 1. Нижняя граница для topRow с data-level="0"
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row.classList.contains('topRow') && row.getAttribute('data-level') === '0') {
                for (let j = 0; j < row.cells.length; j++) {
                    const cell = row.cells[j] as HTMLElement;
                    cell.style.setProperty('border-bottom', `${width}px solid ${color}`, 'important');
                }
                break;
            }
        }

        // 2. Вертикальная граница между первым и вторым столбцом для midRow и totalRow
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row.classList.contains('midRow') || row.classList.contains('totalRow')) {
                if (row.cells.length >= 2) {
                    const firstCell = row.cells[0] as HTMLElement;
                    const secondCell = row.cells[1] as HTMLElement;
                    firstCell.style.setProperty('border-right', `${width}px solid ${color}`, 'important');
                    secondCell.style.setProperty('border-left', `${width}px solid ${color}`, 'important');
                }
            }
        }
    }

    // --- Специальная обработка для Column Header с использованием div (чтобы границы не уезжали при скролле) ---
    const thead = table.querySelector('thead');
    if (thead && borders.columnHeaderGroup) {
        const posTop = borders.columnHeaderGroup.positionTop.value;
        const posBottom = borders.columnHeaderGroup.positionBottom.value;
        const posLeft = borders.columnHeaderGroup.positionLeft.value;
        const posRight = borders.columnHeaderGroup.positionRight.value;
        const borderColor = borders.columnHeaderGroup.color.value.value;
        const borderWidth = borders.columnHeaderGroup.width.value;

        let borderDiv = thead.querySelector('.thead-border') as HTMLElement;
        if (!borderDiv) {
            borderDiv = document.createElement('div');
            borderDiv.className = 'thead-border';
            borderDiv.style.position = 'absolute';
            borderDiv.style.top = '0';
            borderDiv.style.left = '0';
            borderDiv.style.width = '100%';
            borderDiv.style.height = '100%';
            borderDiv.style.pointerEvents = 'none';
            borderDiv.style.boxSizing = 'border-box';
            borderDiv.style.zIndex = '2000';
            thead.appendChild(borderDiv);
        }

        const shadows: string[] = [];
        if (posTop) shadows.push(`inset 0 ${borderWidth}px 0 ${borderColor}`);
        if (posBottom) shadows.push(`inset 0 -${borderWidth}px 0 ${borderColor}`);
        if (posLeft) shadows.push(`inset ${borderWidth}px 0 0 ${borderColor}`);
        if (posRight) shadows.push(`inset -${borderWidth}px 0 0 ${borderColor}`);
        borderDiv.style.boxShadow = shadows.length ? shadows.join(', ') : 'none';
    }
}
