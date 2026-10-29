"use strict";
import powerbi from "powerbi-visuals-api";
import { valueFormatter } from "powerbi-visuals-utils-formattingutils";

export class TableDataviewHtmlFormatter {

    public static formatDataViewTable(
        columns: powerbi.DataViewMetadataColumn[],
        rows: powerbi.DataViewTableRow[],
        totalRow: powerbi.DataViewTableRow | null,
        showGrandTotal: boolean
    ): HTMLElement {
        const htmlElement = document.createElement("div");
        htmlElement.classList.add("datagrid");

        const tableElement = document.createElement("table");
        const theadElement = document.createElement("thead");
        const tbodyElement = document.createElement("tbody");

        const dimIndices: number[] = [];
        const measureIndices: number[] = [];
        for (let i = 0; i < columns.length; i++) {
            if (columns[i].isMeasure) measureIndices.push(i);
            else dimIndices.push(i);
        }

        // ---------- thead ----------
        const headerRow = document.createElement("tr");
        headerRow.classList.add("topRow");
        headerRow.setAttribute("data-level", "0");

        for (const dimIdx of dimIndices) {
            const th = document.createElement("th");
            th.classList.add("rowsHeader");
            th.textContent = columns[dimIdx].displayName || "";
            headerRow.appendChild(th);
        }
        for (let mIdx = 0; mIdx < measureIndices.length; mIdx++) {
            const col = columns[measureIndices[mIdx]];
            const th = document.createElement("th");
            th.classList.add("formatColumnNodes");
            th.setAttribute("id", mIdx.toString());
            th.textContent = col.displayName || "";
            headerRow.appendChild(th);
        }
        headerRow.setAttribute("data-children-num", measureIndices.length.toString());
        theadElement.appendChild(headerRow);

        const borderDiv = document.createElement("div");
        borderDiv.className = "thead-border";
        borderDiv.style.position = "absolute";
        borderDiv.style.top = "0";
        borderDiv.style.left = "0";
        borderDiv.style.width = "100%";
        borderDiv.style.height = "100%";
        borderDiv.style.pointerEvents = "none";
        borderDiv.style.boxSizing = "border-box";
        borderDiv.style.zIndex = "2000";
        theadElement.appendChild(borderDiv);

        // ---------- tbody ----------
        for (const row of rows) {
            tbodyElement.appendChild(
                this.buildRow(row, columns, dimIndices, measureIndices, false)
            );
        }

        if (showGrandTotal && totalRow) {
            tbodyElement.appendChild(
                this.buildRow(totalRow, columns, dimIndices, measureIndices, true)
            );
        }

        tableElement.appendChild(theadElement);
        tableElement.appendChild(tbodyElement);
        htmlElement.appendChild(tableElement);
        return htmlElement;
    }

    /**
     * Универсальное чтение значения ячейки.
     *
     * Power BI в DataViewTable может отдавать ячейку в двух формах:
     *   1) обёртка  { value: PrimitiveValue, objects?: DataViewObjects }  — классический случай;
     *   2) голый примитив (string | number | boolean | Date) — встречается
     *      при маппинге через table.rows с ролью GroupingOrMeasure.
     *
     * Возвращаем значение в любом случае.
     */
    private static getCellValue(cell: any): any {
        if (cell == null) return null;
        if (typeof cell === "object" && cell !== null && "value" in cell) {
            return cell.value;
        }
        return cell;
    }

    /** Аналогично getCellValue — для объектов условного форматирования. */
    private static getCellObjects(cell: any): any {
        if (cell == null || typeof cell !== "object") return null;
        return (cell as any).objects || null;
    }

    private static buildRow(
        row: powerbi.DataViewTableRow,
        columns: powerbi.DataViewMetadataColumn[],
        dimIndices: number[],
        measureIndices: number[],
        isTotal: boolean
    ): HTMLTableRowElement {
        const tr = document.createElement("tr");
        tr.classList.add(isTotal ? "totalRow" : "midRow");
        tr.setAttribute("data-level", "0");

        // --- Разрезы ---
        for (let d = 0; d < dimIndices.length; d++) {
            const col = columns[dimIndices[d]];
            const rawCell: any = row[dimIndices[d]];
            const value = this.getCellValue(rawCell);

            const th = document.createElement("th");
            th.classList.add("formatRowNodes");
            th.style.textAlign = "left";

            const span = document.createElement("span");
            span.className = "row-header-text";

            if (isTotal) {
                span.textContent = d === 0 ? "Total" : "";
            } else if (value != null) {
                span.textContent = this.formatValue(
                    value,
                    col.format || "",
                    !!col.type?.dateTime
                );
            } else {
                span.textContent = "";
            }

            th.appendChild(span);
            tr.appendChild(th);
        }

        // --- Меры ---
        for (let mIdx = 0; mIdx < measureIndices.length; mIdx++) {
            const col = columns[measureIndices[mIdx]];
            const rawCell: any = row[measureIndices[mIdx]];
            const value = this.getCellValue(rawCell);
            const objects = this.getCellObjects(rawCell);

            const td = document.createElement("td");
            td.setAttribute("id", mIdx.toString());

            if (objects) {
                (td as any).__cfObjects = objects;
                td.dataset.hasCf = "1";
            }

            if (value != null) {
                td.appendChild(document.createTextNode(
                    this.formatValue(value, col.format || "", !!col.type?.dateTime)
                ));
            }

            tr.appendChild(td);
        }

        return tr;
    }

    public static formatValue(raw: any, format: string, isDate: boolean): string {
        if (raw == null) return "";

        if (isDate || raw instanceof Date) {
            const date = raw instanceof Date ? raw : new Date(raw);
            if (!isNaN(date.getTime())) {
                try {
                    const options: any = { value: date, cultureSelector: "ru-RU" };
                    if (format) options.format = format;
                    return valueFormatter.create(options).format(date);
                } catch {
                    return date.toLocaleDateString("ru-RU");
                }
            }
        }

        if (typeof raw === "string") return raw;
        if (typeof raw !== "number") return String(raw);

        try {
            const formatString = format || "0";

            if (formatString.includes("%")) {
                const options: any = {
                    format: formatString,
                    value: raw,
                    cultureSelector: "ru-RU",
                    displayUnit: 0
                };
                return valueFormatter.create(options).format(raw);
            }

            let decimalPlaces = 0;
            const decimalMatch = /\.(0+)/.exec(formatString);
            if (decimalMatch) decimalPlaces = decimalMatch[1].length;

            let rounded: number;
            if (decimalPlaces > 0) {
                const factor = Math.pow(10, decimalPlaces);
                rounded = Math.round(raw * factor) / factor;
            } else {
                rounded = Math.round(raw);
            }

            const needsSeparator = formatString.includes(",");
            return rounded.toLocaleString("ru-RU", {
                minimumFractionDigits: decimalPlaces,
                maximumFractionDigits: decimalPlaces,
                useGrouping: needsSeparator
            });
        } catch (err) {
            console.warn("[Table formatter] formatValue error:", err);
            return raw.toLocaleString("ru-RU");
        }
    }
}