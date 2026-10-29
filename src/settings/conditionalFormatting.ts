import {
    ConditionalFormattingCard,
    MeasureCFGroupCard,
    CFMeasureInfo,
    CFRuleOperator,
    CFTextOperator,
    CF_RULES_PER_MEASURE
} from "./settings";

interface RuleView {
    enabled: boolean;
    operator: string;
    value1: number;
    value2: number;
    textOperator: string;
    textValue: string;
    backgroundColor: string | null;
    fontColor: string | null;
}

export class ConditionalFormatting {

    public static applyRules(
        grid: HTMLElement,
        cfCard: ConditionalFormattingCard,
        measures: CFMeasureInfo[]
    ): void {
        if (!cfCard || !measures || measures.length === 0) return;

        const groups = cfCard.groups as MeasureCFGroupCard[];

        // 1) Карта: позиция столбца (из <th id="N">) → индекс меры в measures[]
        const columnToMeasure = this.buildColumnToMeasureMap(grid, measures);
        //console.log("[CF] columnToMeasure =", Array.from(columnToMeasure.entries()));

        // 2) Обратная карта: индекс меры → список позиций столбцов
        const measureToColumns = new Map<number, number[]>();
        columnToMeasure.forEach((measureIdx, colPos) => {
            let arr = measureToColumns.get(measureIdx);
            if (!arr) {
                arr = [];
                measureToColumns.set(measureIdx, arr);
            }
            arr.push(colPos);
        });

        let appliedCells = 0;

        for (let m = 0; m < groups.length && m < measures.length; m++) {
            const group = groups[m];
            if ((group as any).visible === false) continue;

            const columns = measureToColumns.get(m);
            if (!columns || columns.length === 0) continue;

            const rules = this.extractRules(group, m);
            if (rules.length === 0) continue;

            const isNumeric = measures[m].isNumeric;

            // Применяем ко ВСЕМ столбцам, где встречается эта мера
            for (const colPos of columns) {
                const cells = grid.querySelectorAll(`tbody td[id="${colPos}"]`);
                cells.forEach(td => {
                    const cell = td as HTMLElement;
                    const row = cell.parentElement;
                    // Grand total не трогаем — только строки данных.
                    if (!row?.classList.contains("midRow")) return;

                    for (let r = 0; r < rules.length; r++) {
                        const rule = rules[r];
                        if (!rule.enabled) continue;
                        if (!this.matchesRule(cell, rule, isNumeric)) continue;

                        if (rule.backgroundColor) cell.style.backgroundColor = rule.backgroundColor;
                        if (rule.fontColor) cell.style.color = rule.fontColor;
                        appliedCells++;
                        break;
                    }
                });
            }
        }

        //console.log(`[CF] applyRules: applied to ${appliedCells} cells`);
    }

    /**
     * Строит карту: позиция столбца → индекс меры в measures[].
     *
     * Читает шапку таблицы: последняя строка <thead> — это строка мер,
     * где каждый <th class="formatColumnNodes" id="N"> содержит display-имя меры.
     * Сопоставляет текст с measures[i].name (без учёта регистра и пробелов).
     */
    private static buildColumnToMeasureMap(
        grid: HTMLElement,
        measures: CFMeasureInfo[]
    ): Map<number, number> {
        const map = new Map<number, number>();
        if (!measures || measures.length === 0) return map;

        const thead = grid.querySelector("thead");
        if (!thead) return map;

        const rows = Array.from(thead.querySelectorAll("tr"));
        if (rows.length === 0) return map;

        // Строка мер — последняя <tr> в <thead>.
        const measuresRow = rows[rows.length - 1];
        const headerCells = Array.from(
            measuresRow.querySelectorAll("th")
        ) as HTMLTableCellElement[];

        // Случай 1: всего одна мера. Все столбцы с id принадлежат ей.
        if (measures.length === 1) {
            for (const th of headerCells) {
                const idAttr = th.getAttribute("id");
                if (idAttr == null) continue;
                const colPos = parseInt(idAttr, 10);
                if (isNaN(colPos)) continue;
                map.set(colPos, 0);
            }
            return map;
        }

        // Случай 2: несколько мер. Сопоставляем по тексту заголовка.
        const nameToIndex = new Map<string, number>();
        for (let i = 0; i < measures.length; i++) {
            const key = this.normalizeName(measures[i].name);
            if (key && !nameToIndex.has(key)) {
                nameToIndex.set(key, i);
            }
        }

        for (const th of headerCells) {
            const idAttr = th.getAttribute("id");
            if (idAttr == null) continue;
            const colPos = parseInt(idAttr, 10);
            if (isNaN(colPos)) continue;

            const text = this.normalizeName(th.textContent || "");
            const measureIdx = nameToIndex.get(text);
            if (measureIdx !== undefined) {
                map.set(colPos, measureIdx);
            }
        }

        return map;
    }

    private static normalizeName(name: string | undefined): string {
        if (!name) return "";
        return name
            .replace(/\u00A0/g, " ")   // NBSP → обычный пробел
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    private static extractRules(group: MeasureCFGroupCard, measureIndex: number): RuleView[] {
        const rules: RuleView[] = [];
        if (!group.slices) return rules;

        const byName = new Map<string, any>();
        for (const slice of group.slices) {
            const n = (slice as any)?.name;
            if (typeof n === "string") byName.set(n, slice);
        }

        for (let r = 0; r < CF_RULES_PER_MEASURE; r++) {
            const p = `cf_measure_${measureIndex}_rule_${r}`;
            const enabledSlice = byName.get(`${p}_enabled`);
            if (!enabledSlice) continue;

            const v1 = this.parseNumeric(byName.get(`${p}_value1`)?.value ?? "0") ?? 0;
            const v2 = this.parseNumeric(byName.get(`${p}_value2`)?.value ?? "0") ?? 0;

            rules.push({
                enabled: !!enabledSlice.value,
                operator: ((byName.get(`${p}_operator`)?.value as any)?.value as string)
                    || CFRuleOperator.GreaterOrEqual,
                value1: v1,
                value2: v2,
                textOperator: ((byName.get(`${p}_textOperator`)?.value as any)?.value as string)
                    || CFTextOperator.Equals,
                textValue: byName.get(`${p}_textValue`)?.value ?? "",
                backgroundColor: byName.get(`${p}_backgroundColor`)?.value?.value || null,
                fontColor: byName.get(`${p}_fontColor`)?.value?.value || null
            });
        }
        return rules;
    }

    private static matchesRule(cell: HTMLElement, rule: RuleView, isNumeric: boolean): boolean {
        const raw = (cell.textContent || "").trim();

        if (isNumeric) {
            const num = this.parseNumeric(raw);
            if (num === null) return false;
            return this.matchesNumeric(num, rule.operator, rule.value1, rule.value2);
        } else {
            return this.matchesText(raw, rule.textOperator, rule.textValue);
        }
    }

    private static matchesNumeric(v: number, op: string, a: number, b: number): boolean {
        switch (op) {
            case CFRuleOperator.Greater:        return v > a;
            case CFRuleOperator.GreaterOrEqual: return v >= a;
            case CFRuleOperator.Less:           return v < a;
            case CFRuleOperator.LessOrEqual:    return v <= a;
            case CFRuleOperator.Equal:          return v === a;
            case CFRuleOperator.NotEqual:       return v !== a;
            case CFRuleOperator.Between:        return v >= Math.min(a, b) && v <= Math.max(a, b);
            default:                            return false;
        }
    }

    private static matchesText(value: string, op: string, target: string): boolean {
        if (!target && op !== CFTextOperator.Equals && op !== CFTextOperator.NotEquals) {
            return false;
        }
        const v = value.toLowerCase().trim();
        const t = (target || "").toLowerCase().trim();
        switch (op) {
            case CFTextOperator.Equals:     return v === t;
            case CFTextOperator.NotEquals:  return v !== t;
            case CFTextOperator.Contains:   return t.length > 0 && v.includes(t);
            case CFTextOperator.StartsWith: return t.length > 0 && v.startsWith(t);
            case CFTextOperator.EndsWith:   return t.length > 0 && v.endsWith(t);
            default:                        return false;
        }
    }

    /**
     * Парсит строку в число. Если есть символ '%', делит на 100.
     * Примеры: "90%" → 0.9; "0,86" → 0.86; "1 234,56" → 1234.56.
     */
    private static parseNumeric(text: string): number | null {
        if (!text) return null;

        const isPercent = text.indexOf("%") !== -1;

        const c = text
            .replace(/\s/g, "")
            .replace(/,/g, ".")
            .replace(/[^\d.\-]/g, "");

        if (!c || c === "-" || c === ".") return null;

        let n = parseFloat(c);
        if (isNaN(n)) return null;

        if (isPercent) n = n / 100;

        return n;
    }
}