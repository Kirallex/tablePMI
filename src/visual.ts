"use strict";
import '../style/table.css';
import powerbi from "powerbi-visuals-api";
import { TableDataviewHtmlFormatter } from "./table/tableDataViewHtmlFormatter";
import { TableCsvBuilder } from "./export/tableCsvBuilder";
import { ExcelDownloader } from "./export/downloadExcel";
import { HeightResizer } from "./layout/heightResizer";
import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import DataView = powerbi.DataView;
import Host = powerbi.extensibility.visual.IVisualHost;
import VisualDataChangeOperationKind = powerbi.VisualDataChangeOperationKind;
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { applyGridSettings } from "./settings/gridSettings";
import { applyValuesSettings } from "./settings/valuesSettings";
import { applyColumnHeadersSettings } from "./settings/columnHeadersSettings";
import { applyRowHeadersSettings } from "./settings/rowHeaderSettings";
import { applyRowGrandTotalSettings } from "./settings/rowGrandTotalSettings";
import { applyBorderSettings } from "./settings/borderSettings";
import { applySpecificColumnSettings } from "./settings/specificColumnSettings";
import { applyColumnWidthsFromSettings } from "./settings/columnWidth";
import { ConditionalFormatting } from "./settings/conditionalFormatting";
import { IMeasureSettings } from "./settings/measureSettings";
import {
    VisualSettings, MeasureCard, ColumnWidthCard, CFMeasureInfo
} from "./settings/settings";

const HEIGHT_OBJECT_NAME = "heightSettings";
const HEIGHT_PROPERTY_NAME = "customHeight";

const MAX_FALSE_STREAK = 3;
const FETCH_RETRY_DELAY_MS = 150;
const MAX_EMPTY_SEGMENTS = 5;

export class Visual implements IVisual {

    private target: HTMLElement;
    private host: Host;
    private settings: VisualSettings;
    private formattingSettingsService: FormattingSettingsService;

    private currentDataView!: DataView;

    // Накопитель строк (плоский список)
    private accumulatedRows: powerbi.DataViewTableRow[] = [];
    private currentColumns: powerbi.DataViewMetadataColumn[] = [];

    // Меры
    private measureNames: string[] = [];
    private measureInfos: CFMeasureInfo[] = [];

    // Экспорт
    private exportButton: HTMLButtonElement | null = null;
    private exportMonitor: HTMLElement | undefined = undefined;
    private isExporting = false;

    // FetchMoreData
    private canFetchMore = true;
    private allDataLoaded = false;
    private pendingFetch = false;
    private fetchAttempts = 0;
    private falseStreak = 0;
    private emptySegmentsStreak = 0;

    // Скролл
    private savedScrollTop = 0;
    private savedScrollLeft = 0;

    // Высота / viewport
    private currentHeight: number | null = null;
    private viewportHeight = 0;
    private viewportWidth = 0;
    private scrollObserver: ResizeObserver | null = null;

    constructor(options: VisualConstructorOptions) {
        this.target = options.element;
        this.host = options.host;
        this.formattingSettingsService = new FormattingSettingsService();
        this.settings = new VisualSettings();
    }

    // ============================================================
    // update
    // ============================================================

    public update(options: VisualUpdateOptions): void {
        if (!options?.dataViews?.[0]?.table) {
            this.clearDisplay();
            return;
        }

        // ВАЖНО: options.viewport — единственный достоверный источник
        // размеров, выделенных Power BI визуалу. this.target.clientHeight
        // часто равен высоте контента (height:auto), а не вьюпорта.
        this.viewportHeight = options.viewport?.height ?? 0;
        this.viewportWidth = options.viewport?.width ?? 0;

        this.currentDataView = options.dataViews[0];
        this.settings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualSettings, this.currentDataView
        ) as VisualSettings;

        const savedHeight = (this.currentDataView.metadata as any)
            ?.objects?.[HEIGHT_OBJECT_NAME]?.[HEIGHT_PROPERTY_NAME];
        this.currentHeight = (typeof savedHeight === "number" && savedHeight > 0)
            ? savedHeight : null;

        const measures = this.getCurrentMeasures();
        this.measureNames = measures.map(m => m.displayName);
        this.measureInfos = measures.map(m => {
            const t: any = m.type || {};
            return {
                name: m.displayName || "",
                isNumeric: !!(t.numeric || t.integer || t.decimal)
            };
        });
        this.updateGroups();

        const table = this.currentDataView.table!;
        const isCreate = options.operationKind === VisualDataChangeOperationKind.Create;
        const isSegmentResponse = !isCreate;

        if (isCreate) {
            this.accumulatedRows = [];
            this.currentColumns = table.columns || [];
            this.emptySegmentsStreak = 0;
            this.falseStreak = 0;
            this.pendingFetch = false;
            this.allDataLoaded = false;
            this.canFetchMore = true;
            this.appendRows(table.rows || []);
        } else if (isSegmentResponse) {
            if (this.pendingFetch) {
                this.pendingFetch = false;
                this.falseStreak = 0;
            }
            if (table.columns && table.columns.length > 0) {
                this.currentColumns = table.columns;
            }
            this.appendRows(table.rows || []);
        }

        console.log(
            `[table][update] kind=${options.operationKind} ` +
            `segmentRows=${(table.rows || []).length} ` +
            `accumulatedRows=${this.accumulatedRows.length} ` +
            `viewportH=${this.viewportHeight} viewportW=${this.viewportWidth} ` +
            `hasSegment=${!!this.currentDataView.metadata?.segment} ` +
            `isExporting=${this.isExporting}`
        );

        if (isCreate) {
            this.renderVisualization();
            return;
        }

        if (isSegmentResponse) {
            if (this.isExporting) {
                if (this.emptySegmentsStreak >= MAX_EMPTY_SEGMENTS) {
                    this.finalizeExport();
                    return;
                }
                if (!this.currentDataView.metadata?.segment) {
                    this.finalizeExport();
                } else {
                    this.requestMoreDataForExport();
                }
            } else {
                this.canFetchMore = true;
                if (!this.currentDataView.metadata?.segment) {
                    this.allDataLoaded = true;
                    this.canFetchMore = false;
                }
                this.renderVisualization();
            }
        }
    }

    private appendRows(rows: powerbi.DataViewTableRow[]): void {
        if (!rows || rows.length === 0) {
            this.emptySegmentsStreak++;
            return;
        }
        this.emptySegmentsStreak = 0;
        for (const r of rows) this.accumulatedRows.push(r);
    }

    // ============================================================
    // Меры
    // ============================================================

    private getCurrentMeasures(): powerbi.DataViewMetadataColumn[] {
        const columns = this.currentDataView?.table?.columns;
        if (!columns) return [];
        return columns.filter(c => c.isMeasure);
    }

    private updateGroups(): void {
        const columns = this.currentDataView?.table?.columns || [];
        const columnNames = columns.map(c => c.displayName || "");

        (this.settings.specificColumn as any).updateColumns(columnNames);

        // Если Column Width уже переведён на updateColumns — оставьте это;
        // если нет — замените строку на старый updateMeasureWidths(this.measureNames).
        (this.settings.columnWidth as ColumnWidthCard).updateColumns(columnNames);

        this.settings.conditionalFormatting.updateGroups(this.measureInfos);
    }

    // ============================================================
    // Рендер
    // ============================================================

    private renderVisualization(): void {
        // Отключаем предыдущий observer (если был)
        this.scrollObserver?.disconnect();
        this.scrollObserver = null;

        const oldGrid = this.target.querySelector(".datagrid") as HTMLElement;
        if (oldGrid) {
            this.savedScrollTop = oldGrid.scrollTop;
            this.savedScrollLeft = oldGrid.scrollLeft;
        }

        // --- Кнопка экспорта ---
        if (!this.exportButton) {
            const buttonContainer = document.createElement("div");
            buttonContainer.className = "export-button-container";

            this.exportMonitor = document.createElement("div");
            this.exportMonitor.className = "export-monitor";
            buttonContainer.appendChild(this.exportMonitor);

            this.exportButton = document.createElement("button");
            this.exportButton.id = "exportBtn";
            this.exportButton.type = "button";
            this.exportButton.className = "export-button";
            this.exportButton.textContent = "Export Data";
            this.exportButton.addEventListener("click", () => this.handleExportClick());
            buttonContainer.appendChild(this.exportButton);

            this.target.prepend(buttonContainer);
        }

        // --- Удаляем старую таблицу ---
        this.target.querySelectorAll(".datagrid").forEach(g => g.remove());

        // --- Grand total ---
        const showGrandTotal = !!this.settings.subTotals.grandTotal.value;
        const totalRow = showGrandTotal
            ? this.computeTotalRow(this.currentColumns, this.accumulatedRows)
            : null;

        // --- HTML ---
        const formatted = TableDataviewHtmlFormatter.formatDataViewTable(
            this.currentColumns,
            this.accumulatedRows,
            totalRow,
            showGrandTotal
        );

        this.target.appendChild(formatted);

        // --- Стили ---
        applyBorderSettings(formatted, this.settings);
        applyValuesSettings(formatted, this.settings);
        applyColumnHeadersSettings(formatted, this.settings);
        applyRowHeadersSettings(formatted, this.settings);
        applyGridSettings(formatted, this.settings);
        applyRowGrandTotalSettings(formatted, this.settings);

        this.applySpecificColumnStyles(formatted);

        ConditionalFormatting.applyRules(
            formatted,
            this.settings.conditionalFormatting,
            this.measureInfos
        );

        const tableEl = formatted.querySelector("table");
        if (tableEl) {
            applyColumnWidthsFromSettings(
                tableEl as HTMLTableElement,
                this.settings.columnWidth as ColumnWidthCard
            );
        }

        // --- Ограничение высоты для скролла ---
        this.applyScrollHeight(formatted);

        // Пересчитывать при изменении размера target
        this.scrollObserver = new ResizeObserver(() => {
            this.applyScrollHeight(formatted);
        });
        this.scrollObserver.observe(this.target);

        // --- Восстановление скролла ---
        if (!this.isExporting && (this.savedScrollTop > 0 || this.savedScrollLeft > 0)) {
            formatted.scrollTop = this.savedScrollTop;
            formatted.scrollLeft = this.savedScrollLeft;
        }

        // --- Lazy-load через скролл ---
        if (!this.isExporting) {
            formatted.addEventListener("scroll", () => {
                if (this.isExporting) return;
                if (!this.canFetchMore || this.allDataLoaded) return;
                const scrollBottom = formatted.scrollTop + formatted.clientHeight;
                if (scrollBottom >= formatted.scrollHeight - 20) {
                    this.canFetchMore = false;
                    const accepted = this.host.fetchMoreData(false);
                    if (!accepted) {
                        this.canFetchMore = false;
                        this.allDataLoaded = true;
                    }
                }
            });
        }

        // --- Resize handle ---
        HeightResizer.init(
            formatted,
            (h: number) => {
                this.currentHeight = h;
                this.applyScrollHeight(formatted);
            },
            (h: number) => {
                this.currentHeight = h;
                this.persistHeight(h);
                this.applyScrollHeight(formatted);
            }
        );
    }

    // ============================================================
    // Scroll height
    // ============================================================

    /**
     * Устанавливает maxHeight на .datagrid так, чтобы:
     *   • при наличии сохранённой высоты (this.currentHeight) —
     *     фиксированная height: Npx, maxHeight снят;
     *   • иначе — maxHeight = (viewportHeight - buttonHeight).
     *
     * Только при непустом maxHeight и overflow:auto на .datagrid
     * появляется вертикальный скролл и работают sticky-правила для
     * шапки и Total-строки.
     */
    private applyScrollHeight(grid: HTMLElement): void {
        if (this.currentHeight) {
            grid.style.height = this.currentHeight + "px";
            grid.style.maxHeight = "";
            return;
        }

        grid.style.height = "";

        const btn = this.exportButton?.parentElement as HTMLElement | undefined;
        const btnH = btn?.offsetHeight ?? 0;

        // viewportHeight — из options.viewport.height. Fallback на clientHeight
        // (на случай, если визуал ещё в процессе первичной отрисовки).
        const total = this.viewportHeight || this.target.clientHeight;
        const avail = total - btnH;

        console.log(
            "[table] applyScrollHeight",
            "viewportH=", this.viewportHeight,
            "clientH=", this.target.clientHeight,
            "btnH=", btnH,
            "avail=", avail,
            "contentH=", grid.scrollHeight
        );

        grid.style.maxHeight = avail > 0 ? avail + "px" : "";
    }

    // ============================================================
    // Grand total
    // ============================================================

    private computeTotalRow(
        columns: powerbi.DataViewMetadataColumn[],
        rows: powerbi.DataViewTableRow[]
    ): powerbi.DataViewTableRow | null {
        if (!columns || columns.length === 0) return null;

        const getCellValue = (cell: any): any => {
            if (cell == null) return null;
            if (typeof cell === "object" && cell !== null && "value" in cell) {
                return cell.value;
            }
            return cell;
        };

        const total = new Array(columns.length) as powerbi.DataViewTableRow;

        for (let i = 0; i < columns.length; i++) {
            const col = columns[i];
            total[i] = { value: null } as any;

            if (!col.isMeasure) continue;

            // --- boolean-меры ---
            const type = (col.type || {}) as any;
            if (type.bool) {
                let anyTrue = false;
                let hasBoolValue = false;
                for (const row of rows) {
                    const v = getCellValue(row[i]);
                    if (typeof v === "boolean") {
                        hasBoolValue = true;
                        if (v) anyTrue = true;
                    }
                }
                if (hasBoolValue) total[i] = { value: anyTrue } as any;
                continue;
            }

            // --- Числовые меры ---
            let sum = 0;
            let hasNumber = false;
            for (const row of rows) {
                const v = getCellValue(row[i]);
                if (typeof v === "number") {
                    sum += v;
                    hasNumber = true;
                }
            }
            if (hasNumber) total[i] = { value: sum } as any;
        }
        return total;
    }

    // ============================================================
    // Specific column
    // ============================================================

    private applySpecificColumnStyles(container: HTMLElement): void {
        const grid = container.querySelector(".datagrid");
        if (!grid) return;

        const groups = this.settings.specificColumn.groups as MeasureCard[];

        for (let i = 0; i < groups.length; i++) {
            const card = groups[i];
            if ((card as any).visible === false) continue;

            const settings: IMeasureSettings = {
                header: {
                    textColor: card.headerTextColor.value.value,
                    backgroundColor: card.headerBackgroundColor.value.value,
                    alignment: card.headerAlignment.value
                },
                total: {
                    textColor: card.totalTextColor.value.value,
                    backgroundColor: card.totalBackgroundColor.value.value,
                    alignment: card.totalAlignment.value
                },
                values: {
                    textColor: card.valuesTextColor.value.value,
                    backgroundColor: card.valuesBackgroundColor.value.value,
                    alignment: card.valuesAlignment.value
                }
            };
            applySpecificColumnSettings(grid as HTMLElement, settings, i);
        }
    }

    // ============================================================
    // Persist height
    // ============================================================

    private persistHeight(height: number): void {
        try {
            const selector = this.host.createSelectionIdBuilder().createSelectionId().getSelector();
            this.host.persistProperties({
                merge: [{
                    objectName: HEIGHT_OBJECT_NAME,
                    selector,
                    properties: { [HEIGHT_PROPERTY_NAME]: Math.round(height) }
                }]
            });
        } catch (err) {
            console.error("[persistHeight] failed:", err);
        }
    }

    // ============================================================
    // Экспорт
    // ============================================================

    private handleExportClick(): void {
        if (this.isExporting) return;

        this.fetchAttempts = 0;
        this.falseStreak = 0;
        this.pendingFetch = false;
        this.emptySegmentsStreak = 0;

        this.isExporting = true;
        if (this.exportButton) {
            this.exportButton.disabled = true;
            this.exportButton.textContent = "Loading data...";
        }
        this.setExportStatus("Export: Preparing...");

        if (this.allDataLoaded || !this.currentDataView.metadata?.segment) {
            this.exportFromTable();
            return;
        }
        this.requestMoreDataForExport();
    }

    private requestMoreDataForExport(): void {
        this.fetchAttempts++;
        this.setExportStatus(`Export: retrieving segment ${this.fetchAttempts}`);

        if (this.pendingFetch) return;

        try {
            this.pendingFetch = true;
            const accepted = this.host.fetchMoreData(false);
            if (!accepted) {
                this.pendingFetch = false;
                this.falseStreak++;
                if (this.falseStreak < MAX_FALSE_STREAK) {
                    setTimeout(() => this.requestMoreDataForExport(), FETCH_RETRY_DELAY_MS);
                } else {
                    this.finalizeExport();
                }
                return;
            }
            this.falseStreak = 0;
        } catch (err) {
            this.pendingFetch = false;
            console.error("[export] fetchMoreData error:", err);
            this.finalizeExport();
        }
    }

    private finalizeExport(): void {
        if (!this.isExporting) return;
        this.setExportStatus(
            `Export: downloading completed (${this.fetchAttempts} segments). File creation...`
        );
        this.exportFromTable();
    }

    private exportFromTable(): void {
        const t0 = performance.now();
        try {
            if (!this.currentColumns || this.currentColumns.length === 0) {
                this.setExportStatus("Export: error — no data");
                this.resetExportState();
                return;
            }

            const showGrandTotal = !!this.settings.subTotals.grandTotal.value;
            const totalRow = showGrandTotal
                ? this.computeTotalRow(this.currentColumns, this.accumulatedRows)
                : null;

            this.setExportStatus("Export: CSV building...");

            const tBuild = performance.now();
            const result = TableCsvBuilder.build({
                columns: this.currentColumns,
                rows: this.accumulatedRows,
                totalRow,
                showGrandTotal,
                formatValue: (raw, format, isDate) =>
                    TableDataviewHtmlFormatter.formatValue(raw, format, isDate)
            });
            console.log(
                `[export] build: ${(performance.now() - tBuild).toFixed(0)} ms, ` +
                `rows=${result.rowCount}, cols=${result.colCount}`
            );

            const tBlob = performance.now();
            const blob = new Blob(["\uFEFF" + result.csv], { type: "text/csv;charset=utf-8" });
            const blobUrl = URL.createObjectURL(blob);
            console.log(`[export] blob: ${(performance.now() - tBlob).toFixed(0)} ms`);

            const downloader = new ExcelDownloader();
            downloader.showCsvModal(blobUrl, result.rowCount, () => {
                if (this.exportMonitor) this.exportMonitor.textContent = "";
            });

            this.setExportStatus(
                `Export: completed. ${this.fetchAttempts} segments. ` +
                `Copy link from modal window.`
            );
            console.log(
                `[export] total: ${(performance.now() - t0).toFixed(0)} ms`
            );
        } catch (err) {
            console.error("[export] failed:", err);
            this.setExportStatus("Export: error. Open console for details.");
        } finally {
            this.resetExportState();
        }
    }

    private resetExportState(): void {
        this.isExporting = false;
        this.allDataLoaded = true;
        this.pendingFetch = false;
        if (this.exportButton) {
            this.exportButton.disabled = false;
            this.exportButton.textContent = "Export Data";
        }
    }

    private setExportStatus(text: string): void {
        if (!this.exportMonitor) return;
        this.exportMonitor.textContent = text;
    }

    // ============================================================
    // Formatting model
    // ============================================================

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        try {
            const measures = this.getCurrentMeasures();
            this.measureNames = measures.map(m => m.displayName);
            this.measureInfos = measures.map(m => {
                const t: any = m.type || {};
                return {
                    name: m.displayName || "",
                    isNumeric: !!(t.numeric || t.integer || t.decimal)
                };
            });
            this.updateGroups();
            return this.formattingSettingsService.buildFormattingModel(this.settings);
        } catch (err) {
            console.error("getFormattingModel error:", err);
            return { cards: [] };
        }
    }

    // ============================================================
    // Очистка
    // ============================================================

    private clearDisplay(): void {
        this.scrollObserver?.disconnect();
        this.scrollObserver = null;

        const btn = this.exportButton?.parentElement;
        while (this.target.firstChild) {
            if (this.target.firstChild === btn) break;
            this.target.removeChild(this.target.firstChild);
        }
    }
}