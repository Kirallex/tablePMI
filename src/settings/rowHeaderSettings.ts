import { VisualSettings } from "./settings";

const ALT_ROW_PARITY = 1;

export function applyRowHeadersSettings(container: HTMLElement, settings: VisualSettings): void {
    const table = container.querySelector("table") as HTMLTableElement | null;
    if (!table) return;

    const rowHeadersGroup = settings.rowHeaders?.rowHeadersGroup as any;
    if (!rowHeadersGroup) return;

    const textAlignment: string = rowHeadersGroup.textAlignment.value || "left";
    const branded: boolean = !!rowHeadersGroup.brandedRowColor?.value;

    if (branded) {
        applyBrandedFromValues(table, settings, textAlignment);
    } else {
        applyOwnRowHeadersStyle(table, rowHeadersGroup, textAlignment);
    }
}

/* ============================================================
 * Режим 1: собственные стили Row headers (branded = false)
 * ============================================================ */

function applyOwnRowHeadersStyle(
    table: HTMLTableElement,
    rowHeadersGroup: any,
    textAlignment: string
): void {
    const fontFamily: string = rowHeadersGroup.font.fontFamily.value;
    const fontSize: number = rowHeadersGroup.font.fontSize.value;
    const isBold: boolean = !!rowHeadersGroup.font?.bold?.value;
    const isItalic: boolean = !!rowHeadersGroup.font?.italic?.value;
    const isUnderline: boolean = !!rowHeadersGroup.font?.underline?.value;

    const textColor: string = rowHeadersGroup.textColor.value.value;
    const bgColor: string = rowHeadersGroup.backgroundColor.value.value;

    const apply = (cell: HTMLElement): void => {
        cell.style.setProperty("font-family", fontFamily, "important");
        cell.style.setProperty("font-size", `${fontSize}px`, "important");
        cell.style.setProperty("font-weight", isBold ? "bold" : "normal", "important");
        cell.style.setProperty("font-style", isItalic ? "italic" : "normal", "important");
        cell.style.setProperty("text-decoration", isUnderline ? "underline" : "none", "important");
        cell.style.setProperty("color", textColor, "important");
        cell.style.setProperty("background-color", bgColor, "important");
        cell.style.setProperty("text-align", textAlignment, "important");

        const span = cell.querySelector(".row-header-text") as HTMLElement | null;
        if (span) span.style.removeProperty("text-align");
    };

    table.querySelectorAll("tbody th.formatRowNodes").forEach(cell => {
        apply(cell as HTMLElement);
    });
}

/* ============================================================
 * Режим 2: брендирование из Values (branded = true)
 * ============================================================ */

function applyBrandedFromValues(
    table: HTMLTableElement,
    settings: VisualSettings,
    textAlignment: string
): void {
    const valuesGroup = (settings.values as any)?.valuesGroup;
    if (!valuesGroup) return;

    const fontFamily: string = valuesGroup.font.fontFamily.value;
    const fontSize: number = valuesGroup.font.fontSize.value;
    const isBold: boolean = !!valuesGroup.font?.bold?.value;
    const isItalic: boolean = !!valuesGroup.font?.italic?.value;
    const isUnderline: boolean = !!valuesGroup.font?.underline?.value;

    const textColor: string = valuesGroup.textColor.value.value;
    const bgColor: string = valuesGroup.backgroundColor.value.value;
    // alt-цвета опциональны: если не заданы (пустая строка) — fallback на основные.
    const altTextColor: string = valuesGroup.altTextColor?.value?.value || textColor;
    const altBgColor: string = valuesGroup.altBackgroundColor?.value?.value || bgColor;

    // totalRow не трогаем — им управляет applyRowGrandTotalSettings.
    const bodyRows = table.querySelectorAll("tbody tr.midRow");
    bodyRows.forEach((rowNode, rowIndex) => {
        const row = rowNode as HTMLTableRowElement;
        const isAlt = rowIndex % 2 === ALT_ROW_PARITY;
        const color = isAlt ? altTextColor : textColor;
        const bg = isAlt ? altBgColor : bgColor;

        const headerCells = row.querySelectorAll("th.formatRowNodes");
        headerCells.forEach(cellNode => {
            const cell = cellNode as HTMLElement;
            cell.style.setProperty("font-family", fontFamily, "important");
            cell.style.setProperty("font-size", `${fontSize}px`, "important");
            cell.style.setProperty("font-weight", isBold ? "bold" : "normal", "important");
            cell.style.setProperty("font-style", isItalic ? "italic" : "normal", "important");
            cell.style.setProperty("text-decoration", isUnderline ? "underline" : "none", "important");
            cell.style.setProperty("color", color, "important");
            cell.style.setProperty("background-color", bg, "important");
            cell.style.setProperty("text-align", textAlignment, "important");

            const span = cell.querySelector(".row-header-text") as HTMLElement | null;
            if (span) span.style.removeProperty("text-align");
        });
    });
}