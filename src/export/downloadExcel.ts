"use strict";
import "../../style/excelDownloadModal.css";

// Переиспользуемые regex (создаются один раз, а не на каждой ячейке).
const RE_NEWLINES_GLOBAL = /[\r\n]+/g;
const RE_WHITESPACE_GLOBAL = /[\s\u00A0]/g;
const RE_NBSP_GLOBAL = /\u00A0/g;
const RE_NUMERIC = /^-?\d+(?:\.\d+)?$/;
const RE_QUOTE_GLOBAL = /"/g;

export class ExcelDownloader {
    constructor() {}

    public exportTable(table: HTMLElement): void {
        const tStart = performance.now();
        this.exportToCSV(table);
        console.log(
            `[csv] exportTable total: ` +
            `${(performance.now() - tStart).toFixed(0)} ms`
        );
    }

    private exportToCSV(table: HTMLElement): void {
        const tScanStart = performance.now();

        const tbody = table.querySelector("tbody");
        if (!tbody) return;

        const rowElements = tbody.children;
        if (rowElements.length === 0) return;

        // --- Шаг 1: определяем максимальный уровень строк ---
        let maxLevel = 0;
        for (let i = 0; i < rowElements.length; i++) {
            const tr = rowElements[i] as HTMLElement;
            if (tr.tagName !== "TR") continue;
            const levelAttr = tr.getAttribute("data-level");
            if (levelAttr) {
                const level = parseInt(levelAttr, 10);
                if (!isNaN(level) && level > maxLevel) maxLevel = level;
            }
        }
        const headerColsCount = maxLevel + 1;

        // --- Шаг 2: собираем все строки в массив ---
        // Размер — с запасом, чтобы не реаллоцировать.
        // +1 на шапку и +2 на возможные total-строки, которые могут появиться.
        const lines: string[] = new Array(rowElements.length + 8);
        let lineIdx = 0;

        // 2a. Шапка thead
        const thead = table.querySelector("thead");
        if (thead) {
            const theadRows = thead.children;
            for (let r = 0; r < theadRows.length; r++) {
                const tr = theadRows[r] as HTMLElement;
                if (tr.tagName !== "TR") continue;

                const cells: string[] = [];
                const ths = tr.children;

                // Первый <th> — это rowsHeader (DateKey / ProductName).
                // Остальные — заголовки мер.
                let firstTh: HTMLElement | null = null;
                for (let i = 0; i < ths.length; i++) {
                    const el = ths[i] as HTMLElement;
                    if (el.tagName === "TH") {
                        firstTh = el;
                        break;
                    }
                }

                if (firstTh) {
                    cells.push(this.extractCellTextFast(firstTh));

                    // Пустые ячейки под остальные уровни строк.
                    for (let i = 0; i < headerColsCount - 1; i++) cells.push("");

                    // Все остальные <th> — заголовки мер.
                    let seenFirst = false;
                    for (let i = 0; i < ths.length; i++) {
                        const el = ths[i] as HTMLElement;
                        if (el.tagName !== "TH") continue;
                        if (!seenFirst) { seenFirst = true; continue; }
                        cells.push(this.extractCellTextFast(el));
                    }
                }

                lines[lineIdx++] = this.escapeRow(cells);
            }
        }

        // 2b. Тело tbody
        for (let i = 0; i < rowElements.length; i++) {
            const tr = rowElements[i] as HTMLElement;
            if (tr.tagName !== "TR") continue;

            const levelAttr = tr.getAttribute("data-level");
            const level = levelAttr ? parseInt(levelAttr, 10) : 0;

            const headerCols: string[] = new Array(headerColsCount).fill("");

            // Ищем <th.formatRowNodes> и текст внутри него.
            // Проходим ТОЛЬКО по прямым детям <tr>, чтобы не сканировать всё поддерево.
            let headerText = "";
            let headerCell: HTMLElement | null = null;
            const trChildren = tr.children;

            for (let c = 0; c < trChildren.length; c++) {
                const el = trChildren[c] as HTMLElement;
                if (el.tagName === "TH" && el.classList.contains("formatRowNodes")) {
                    headerCell = el;
                    break;
                }
            }

            if (headerCell) {
                // Дешёвый путь: сначала ищем .row-header-text среди прямых потомков.
                // Если не находим — берём textContent всего <th>.
                const directText = this.findRowHeaderText(headerCell);
                if (directText !== null) {
                    headerText = directText;
                } else {
                    headerText = (headerCell.textContent || "")
                        .replace(RE_NBSP_GLOBAL, " ")
                        .trim();
                }
            }

            if (this.isNumericFast(headerText)) {
                headerText = headerText.replace(RE_WHITESPACE_GLOBAL, "");
            }
            headerCols[level] = headerText;

            // Данные — все <td> прямые дети <tr>.
            const dataCells: string[] = [];
            for (let c = 0; c < trChildren.length; c++) {
                const el = trChildren[c] as HTMLElement;
                if (el.tagName !== "TD") continue;
                let text = (el.textContent || "").replace(RE_NEWLINES_GLOBAL, " ");
                if (this.isNumericFast(text)) {
                    text = text.replace(RE_WHITESPACE_GLOBAL, "");
                }
                dataCells.push(text);
            }

            // Собираем полную строку: headerCols + dataCells.
            const fullRow: string[] = headerCols;
            for (let d = 0; d < dataCells.length; d++) {
                fullRow.push(dataCells[d]);
            }

            lines[lineIdx++] = this.escapeRow(fullRow);
        }

        // Обрезаем массив до реально заполненной длины (могли создать с запасом).
        lines.length = lineIdx;

        console.log(
            `[csv] step1 scan+collect: ` +
            `${(performance.now() - tScanStart).toFixed(0)} ms, ` +
            `rows=${lineIdx}`
        );

        // --- Шаг 3: один join вместо N конкатенаций ---
        const tJoinStart = performance.now();
        const csv = lines.join("\n");
        console.log(
            `[csv] step2 join: ` +
            `${(performance.now() - tJoinStart).toFixed(0)} ms, ` +
            `csvLength=${csv.length}`
        );

        // --- Шаг 4: Blob + модалка ---
        const tBlobStart = performance.now();
        const bom = "\uFEFF";
        const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
        const blobUrl = URL.createObjectURL(blob);
        console.log(
            `[csv] step3 blob creation: ` +
            `${(performance.now() - tBlobStart).toFixed(0)} ms`
        );

        this.showDownloadModal(blobUrl, rowElements.length);
    }

    /**
     * Ищет .row-header-text среди прямых потомков <th>.
     * Если не находит — возвращает null, вызывающий код использует textContent.
     */
    private findRowHeaderText(headerCell: HTMLElement): string | null {
        const kids = headerCell.children;
        for (let i = 0; i < kids.length; i++) {
            const el = kids[i] as HTMLElement;
            if (el.tagName === "SPAN" && el.classList.contains("row-header-text")) {
                return el.textContent || "";
            }
        }
        return null;
    }

    /**
     * Быстрая проверка «текст — это число».
     *
     * Fast-path: если в строке нет ни одной цифры, дальше идти не нужно.
     * Это отсекает почти все текстовые ячейки без regex-теста.
     */
    private isNumericFast(text: string): boolean {
        if (!text) return false;

        // Fast-path: ищем первую цифру. Если её нет — не число.
        let hasDigit = false;
        for (let i = 0; i < text.length; i++) {
            const c = text.charCodeAt(i);
            if (c >= 48 && c <= 57) { hasDigit = true; break; }
        }
        if (!hasDigit) return false;

        // Медленный путь: очистка и проверка через regex.
        let cleaned = text.replace(RE_WHITESPACE_GLOBAL, "");
        if (cleaned === "") return false;
        if (cleaned.indexOf(",") !== -1) {
            cleaned = cleaned.replace(/,/g, ".");
        }
        return RE_NUMERIC.test(cleaned);
    }

    /**
     * Извлекает текст из ячейки шапки. Для чисел — убирает пробелы-разделители.
     */
    private extractCellTextFast(cell: HTMLElement): string {
        let text = (cell.textContent || "").replace(RE_NEWLINES_GLOBAL, " ");
        if (this.isNumericFast(text)) {
            text = text.replace(RE_WHITESPACE_GLOBAL, "");
        }
        return text;
    }

    /**
     * Экранирует и склеивает одну строку CSV.
     * Разделитель — «;».
     */
    private escapeRow(cells: string[]): string {
        const out: string[] = new Array(cells.length);
        for (let i = 0; i < cells.length; i++) {
            let text = cells[i] || "";
            if (text.indexOf('"') !== -1) {
                text = text.replace(RE_QUOTE_GLOBAL, '""');
            }
            // Оборачиваем в кавычки, если есть разделитель, кавычка или перевод строки.
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


    private showDownloadModal(blobUrl: string, cntRows: Number, onClose?: () => void): void {
        const modal = document.createElement("div");
        modal.className = "excel-download-modal";

        const modalContent = document.createElement("div");
        modalContent.className = "excel-download-modal-content";

        const title = document.createElement("h3");
        title.textContent = "Скачать CSV файл";
        title.className = "excel-download-modal-title";
        modalContent.appendChild(title);

        const instruction = document.createElement("p");
        instruction.textContent = "Скопируйте ссылку ниже, вставьте в отдельную вкладку браузера и нажмите Enter.";
        instruction.className = "excel-download-modal-instruction";
        modalContent.appendChild(instruction);

        const windowInstruction = document.createElement("p");
        windowInstruction.textContent = "Не закрывайте данное окно, пока не выгрузите файл!";
        windowInstruction.className = "excel-download-modal-instruction-close";
        modalContent.appendChild(windowInstruction);

        const numberOfRowsToDownload = document.createElement("p");
        numberOfRowsToDownload.textContent = `Количество строк для скачивания: ${cntRows}`;
        numberOfRowsToDownload.className = "excel-download-modal-count-rows";
        modalContent.appendChild(numberOfRowsToDownload);

        const linkContainer = document.createElement("div");
        linkContainer.className = "excel-download-modal-link-container";

        const linkInput = document.createElement("input");
        linkInput.type = "text";
        linkInput.value = blobUrl;
        linkInput.readOnly = true;
        linkInput.className = "excel-download-modal-link-input";

        linkInput.addEventListener("focus", () => {
            linkInput.select();
        });

        const copyButton = document.createElement("button");
        copyButton.textContent = "Копировать";
        copyButton.className = "excel-download-modal-copy-button";

        copyButton.onclick = () => {
            this.copyToClipboard(blobUrl, copyButton);
        };

        linkContainer.appendChild(linkInput);
        linkContainer.appendChild(copyButton);
        modalContent.appendChild(linkContainer);

        const closeButton = document.createElement("button");
        closeButton.textContent = "Закрыть";
        closeButton.className = "excel-download-modal-close-button";

        // Единая функция закрытия — вызывается и по кнопке, и по клику на подложку.
        const closeModal = () => {
            URL.revokeObjectURL(blobUrl);
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
            if (onClose) {
                try { onClose(); } catch (e) { console.error("[modal] onClose error:", e); }
            }
        };

        closeButton.onclick = closeModal;

        modalContent.appendChild(closeButton);
        modal.appendChild(modalContent);

        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        document.body.appendChild(modal);

        setTimeout(() => {
            linkInput.select();
        }, 100);
    }

    private copyToClipboard(text: string, button: HTMLButtonElement): void {
        const originalText = button.textContent;

        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();

        try {
            const successful = document.execCommand("copy");
            if (successful) {
                button.textContent = "Скопировано!";
                button.classList.add("copied");
            } else {
                button.textContent = "Ошибка";
                button.classList.add("error");
            }
        } catch (err) {
            button.textContent = "Ошибка";
            button.classList.add("error");
        }

        document.body.removeChild(textArea);

        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove("copied", "error");
        }, 2000);
    }

        /**
     * Показывает модалку скачивания для уже готового CSV-стрима.
     * Используется, когда CSV сформирован в обход DOM (MatrixCsvBuilder).
     */
    public showCsvModal(blobUrl: string, rowCount: number, onClose?: () => void): void {
        this.showDownloadModal(blobUrl, rowCount, onClose);
    }
}