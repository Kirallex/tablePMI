"use strict";
import powerbi from "powerbi-visuals-api";

export interface TableCsvOptions {
    columns: powerbi.DataViewMetadataColumn[];
    rows: powerbi.DataViewTableRow[];
    totalRow: powerbi.DataViewTableRow | null;
    showGrandTotal: boolean;
    formatValue: (raw: any, format: string, isDate: boolean) => string;
}

export interface TableCsvResult {
    csv: string;
    rowCount: number;
    colCount: number;
}

export class TableCsvBuilder {

    public static build(opts: TableCsvOptions): TableCsvResult {
        const columns = opts.columns || [];
        const rows = opts.rows || [];
        if (columns.length === 0) return { csv: "", rowCount: 0, colCount: 0 };

        const lines: string[] = [];

        const headerCells: string[] = new Array(columns.length);
        for (let i = 0; i < columns.length; i++) {
            headerCells[i] = columns[i].displayName || "";
        }
        lines.push(this.escapeRow(headerCells));

        for (const row of rows) {
            lines.push(this.escapeRow(this.rowToCells(row, columns, opts.formatValue)));
        }

        if (opts.showGrandTotal && opts.totalRow) {
            lines.push(
                this.escapeRow(this.rowToCells(opts.totalRow, columns, opts.formatValue))
            );
        }

        return {
            csv: lines.join("\n"),
            rowCount: rows.length + (opts.showGrandTotal && opts.totalRow ? 1 : 0),
            colCount: columns.length
        };
    }

    private static getCellValue(cell: any): any {
        if (cell == null) return null;
        if (typeof cell === "object" && cell !== null && "value" in cell) {
            return cell.value;
        }
        return cell;
    }

    private static rowToCells(
        row: powerbi.DataViewTableRow,
        columns: powerbi.DataViewMetadataColumn[],
        formatValue: (raw: any, format: string, isDate: boolean) => string
    ): string[] {
        const cells: string[] = new Array(columns.length);
        for (let i = 0; i < columns.length; i++) {
            const col = columns[i];
            const value = this.getCellValue(row[i]);
            if (value != null) {
                cells[i] = formatValue(
                    value,
                    col.format || "",
                    !!col.type?.dateTime
                );
            } else {
                cells[i] = "";
            }
        }
        return cells;
    }

    private static escapeRow(cells: string[]): string {
        const out: string[] = new Array(cells.length);
        for (let i = 0; i < cells.length; i++) {
            let text = cells[i] || "";
            if (text.indexOf('"') !== -1) text = text.replace(/"/g, '""');
            if (
                text.indexOf(";") !== -1 ||
                text.indexOf(",") !== -1 ||
                text.indexOf('"') !== -1 ||
                text.indexOf("\n") !== -1
            ) {
                text = `"${text}"`;
            }
            out[i] = text;
        }
        return out.join(";");
    }
}