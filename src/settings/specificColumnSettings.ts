import { IMeasureSettings, IColumnPartSettings } from "./measureSettings";

/**
 * Применяет настройки «Specific column» к одной колонке.
 *
 * Ищет ячейки по data-col-index (ставится formatter'ом на каждый th/td)
 * и раскладывает стили по трём зонам:
 *   • header — <thead> (любые th/td этой колонки),
 *   • values — <tbody tr.midRow> (строки данных),
 *   • total  — <tbody tr.totalRow> (строка итогов).
 *
 * Пустые значения ("" — «не задано») не применяются: иначе слот с
 * дефолтными ""-ями затирал бы стили из Values / Row Headers / Row Grand
 * Total для тех колонок, где пользователь ничего не настраивал.
 *
 * !important нужен, чтобы перебить applyValuesSettings / applyRowHeadersSettings /
 * applyRowGrandTotalSettings — Specific column применяется после них и должен
 * иметь приоритет.
 */
export function applySpecificColumnSettings(
    grid: HTMLElement,
    settings: IMeasureSettings,
    columnIndex: number
): void {
    if (!grid || columnIndex < 0) return;

    const selector = `[data-col-index="${columnIndex}"]`;

    // Header (thead, любые ячейки)
    grid.querySelectorAll(`thead ${selector}`).forEach(cell => {
        applyPart(cell as HTMLElement, settings.header);
    });

    // Values (только строки данных)
    grid.querySelectorAll(`tbody tr.midRow ${selector}`).forEach(cell => {
        applyPart(cell as HTMLElement, settings.values);
    });

    // Total (только строка итогов)
    grid.querySelectorAll(`tbody tr.totalRow ${selector}`).forEach(cell => {
        applyPart(cell as HTMLElement, settings.total);
    });
}

function applyPart(cell: HTMLElement, part: IColumnPartSettings): void {
    if (!part) return;

    // Пустая строка = «не задано» у ColorPicker/AlignmentGroup. Не трогаем.
    if (part.textColor) {
        cell.style.setProperty("color", part.textColor, "important");
    }
    if (part.backgroundColor) {
        cell.style.setProperty("background-color", part.backgroundColor, "important");
    }
    if (part.alignment) {
        // text-align — на <th>/<td> (table-cell, block-контейнер),
        // не на внутренний inline-<span> (см. фикс Row headers).
        cell.style.setProperty("text-align", part.alignment, "important");

        const span = cell.querySelector(".row-header-text") as HTMLElement | null;
        if (span) span.style.removeProperty("text-align");
    }
}