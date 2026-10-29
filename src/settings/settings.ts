import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import powerbi from "powerbi-visuals-api";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsCompositeCard = formattingSettings.CompositeCard;
import FormattingSettingsModel = formattingSettings.Model;

// --- SubTotals (только grandTotal) ---
class SubtotalsCard extends FormattingSettingsCard {
    public grandTotal = new formattingSettings.ToggleSwitch({
        name: "grandTotal", displayName: "Grand total", value: true
    });
    public name = "subTotals";
    public displayName = "Subtotals";
    public slices = [this.grandTotal];
}

// --- Grid ---
class HorizontalGridlinesGroup extends FormattingSettingsCard {
    public color = new formattingSettings.ColorPicker({
        name: "horizontalColor", displayName: "Color",
        value: { value: "transparent" }
    });
    public width = new formattingSettings.NumUpDown({
        name: "horizontalWidth", displayName: "Width", value: 1,
        options: { minValue: 0, maxValue: 10, step: 1 } as any
    });
    public name = "horizontalGroup";
    public displayName = "Horizontal gridlines";
    public slices = [this.color, this.width];
}

class VerticalGridlinesGroup extends FormattingSettingsCard {
    public color = new formattingSettings.ColorPicker({
        name: "verticalColor", displayName: "Color",
        value: { value: "transparent" }
    });
    public width = new formattingSettings.NumUpDown({
        name: "verticalWidth", displayName: "Width", value: 1,
        options: { minValue: 0, maxValue: 10, step: 1 } as any
    });
    public name = "verticalGroup";
    public displayName = "Vertical gridlines";
    public slices = [this.color, this.width];
}

class OptionsGroup extends FormattingSettingsCard {
    public rowPadding = new formattingSettings.NumUpDown({
        name: "rowPadding", displayName: "Row Padding", value: 5,
        options: { minValue: 0, maxValue: 50, step: 1 } as any
    });
    public name = "optionsGroup";
    public displayName = "Options";
    public slices = [this.rowPadding];
}

class GridCard extends FormattingSettingsCompositeCard {
    public horizontalGroup: HorizontalGridlinesGroup;
    public verticalGroup: VerticalGridlinesGroup;
    public optionsGroup: OptionsGroup;
    public groups: FormattingSettingsCard[];
    public name = "grid";
    public displayName = "Grid";
    constructor() {
        super();
        this.horizontalGroup = new HorizontalGridlinesGroup();
        this.verticalGroup = new VerticalGridlinesGroup();
        this.optionsGroup = new OptionsGroup();
        this.groups = [this.horizontalGroup, this.verticalGroup, this.optionsGroup];
    }
}

// --- Borders ---
class BorderSectionCard extends FormattingSettingsCard {
    // ← добавлены типы
    public positionTop: formattingSettings.ToggleSwitch;
    public positionBottom: formattingSettings.ToggleSwitch;
    public positionLeft: formattingSettings.ToggleSwitch;
    public positionRight: formattingSettings.ToggleSwitch;
    public color: formattingSettings.ColorPicker;
    public width: formattingSettings.NumUpDown;

    constructor(sectionName: string, displayName: string) {
        super();
        this.name = sectionName;
        this.displayName = displayName;
        this.positionTop    = new formattingSettings.ToggleSwitch({ name: `${sectionName}_top`,    displayName: "Top",    value: false });
        this.positionBottom = new formattingSettings.ToggleSwitch({ name: `${sectionName}_bottom`, displayName: "Bottom", value: false });
        this.positionLeft   = new formattingSettings.ToggleSwitch({ name: `${sectionName}_left`,   displayName: "Left",   value: false });
        this.positionRight  = new formattingSettings.ToggleSwitch({ name: `${sectionName}_right`,  displayName: "Right",  value: false });
        this.color = new formattingSettings.ColorPicker({ name: `${sectionName}_color`, displayName: "Color", value: { value: "#F1F1F1" } });
        this.width = new formattingSettings.NumUpDown({ name: `${sectionName}_width`, displayName: "Width", value: 1, options: { minValue: 0, maxValue: 10, step: 1 } as any });
        this.slices = [
            this.positionTop, this.positionBottom, this.positionLeft, this.positionRight,
            this.color, this.width
        ];
    }
}

class BordersCard extends FormattingSettingsCompositeCard {
    // ← добавлены типы
    public allGroup: BorderSectionCard;
    public columnHeaderGroup: BorderSectionCard;
    public rowHeaderGroup: BorderSectionCard;
    public valuesGroup: BorderSectionCard;
    public groups: FormattingSettingsCard[];
    public name = "borders";
    public displayName = "Borders";
    constructor() {
        super();
        this.allGroup = new BorderSectionCard("all", "All");
        this.columnHeaderGroup = new BorderSectionCard("columnHeader", "Column header");
        this.rowHeaderGroup = new BorderSectionCard("rowHeader", "Row header");
        this.valuesGroup = new BorderSectionCard("values", "Values section");
        this.groups = [this.allGroup, this.columnHeaderGroup, this.rowHeaderGroup, this.valuesGroup];
    }
}

// --- Values ---
class ValuesGroup extends FormattingSettingsCard {
    public font = new formattingSettings.FontControl({
        name: "font", displayName: "Font",
        fontFamily: new formattingSettings.FontPicker({ name: "fontFamily", value: "Segoe UI Semibold" }),
        fontSize: new formattingSettings.NumUpDown({ name: "fontSize", value: 9, options: { minValue: 8, maxValue: 72, step: 1 } as any }),
        bold: new formattingSettings.ToggleSwitch({ name: "bold", value: false }),
        italic: new formattingSettings.ToggleSwitch({ name: "italic", value: false }),
        underline: new formattingSettings.ToggleSwitch({ name: "underline", value: false })
    });
    public textColor = new formattingSettings.ColorPicker({ name: "textColor", displayName: "Text color", value: { value: "#1E2323" } });
    public backgroundColor = new formattingSettings.ColorPicker({ name: "backgroundColor", displayName: "Background color", value: { value: "#FFFFFF" } });
    public altTextColor = new formattingSettings.ColorPicker({ name: "altTextColor", displayName: "Alternate text color", value: { value: "#1E2323" } });
    public altBackgroundColor = new formattingSettings.ColorPicker({ name: "altBackgroundColor", displayName: "Alternate background color", value: { value: "#FFFFFF" } });
    public name = "valuesGroup";
    public displayName = "Values";
    public slices = [this.font, this.textColor, this.backgroundColor, this.altTextColor, this.altBackgroundColor];
}

class ValuesCard extends FormattingSettingsCompositeCard {
    public valuesGroup: ValuesGroup;
    public groups: FormattingSettingsCard[];
    public name = "values";
    public displayName = "Values";
    constructor() {
        super();
        this.valuesGroup = new ValuesGroup();
        this.groups = [this.valuesGroup];
    }
}

// --- Column Headers (БЕЗ hideTechRowLabel) ---
class ColumnHeadersGroup extends FormattingSettingsCard {
    public font = new formattingSettings.FontControl({
        name: "font", displayName: "Font",
        fontFamily: new formattingSettings.FontPicker({ name: "fontFamily", value: "Segoe UI" }),
        fontSize: new formattingSettings.NumUpDown({ name: "fontSize", value: 9, options: { minValue: 8, maxValue: 72, step: 1 } as any }),
        bold: new formattingSettings.ToggleSwitch({ name: "bold", value: true }),
        italic: new formattingSettings.ToggleSwitch({ name: "italic", value: false }),
        underline: new formattingSettings.ToggleSwitch({ name: "underline", value: false })
    });
    public textColor = new formattingSettings.ColorPicker({ name: "textColor", displayName: "Text color", value: { value: "#1E2323" } });
    public backgroundColor = new formattingSettings.ColorPicker({ name: "backgroundColor", displayName: "Background color", value: { value: "#FFFFFF" } });
    public headerAlignment = new formattingSettings.AlignmentGroup({ name: "headerAlignment", displayName: "Header alignment", value: "left", mode: powerbi.visuals.AlignmentGroupMode.Horizonal });
    public titleAlignment = new formattingSettings.AlignmentGroup({ name: "titleAlignment", displayName: "Title alignment", value: "left", mode: powerbi.visuals.AlignmentGroupMode.Horizonal });
    public name = "columnHeadersGroup";
    public displayName = "Text";
    public slices = [this.font, this.textColor, this.backgroundColor, this.headerAlignment, this.titleAlignment];
}

class ColumnHeadersCard extends FormattingSettingsCompositeCard {
    public columnHeadersGroup: ColumnHeadersGroup;
    public groups: FormattingSettingsCard[];
    public name = "columnHeaders";
    public displayName = "Column Headers";
    constructor() {
        super();
        this.columnHeadersGroup = new ColumnHeadersGroup();
        this.groups = [this.columnHeadersGroup];
    }
}

// --- Row Headers ---
class RowHeadersGroup extends FormattingSettingsCard {
    public font = new formattingSettings.FontControl({
        name: "font", displayName: "Font",
        fontFamily: new formattingSettings.FontPicker({ name: "fontFamily", value: "Segoe UI" }),
        fontSize: new formattingSettings.NumUpDown({ name: "fontSize", value: 9, options: { minValue: 8, maxValue: 72, step: 1 } as any }),
        bold: new formattingSettings.ToggleSwitch({ name: "bold", value: true }),
        italic: new formattingSettings.ToggleSwitch({ name: "italic", value: false }),
        underline: new formattingSettings.ToggleSwitch({ name: "underline", value: false })
    });
    public textColor = new formattingSettings.ColorPicker({ name: "textColor", displayName: "Text color", value: { value: "#1E2323" } });
    public backgroundColor = new formattingSettings.ColorPicker({ name: "backgroundColor", displayName: "Background color", value: { value: "#FFFFFF" } });
    public brandedRowColor = new formattingSettings.ToggleSwitch({ name: "brandedRowColor", displayName: "Branded row color", value: true });
    public textAlignment = new formattingSettings.AlignmentGroup({ name: "textAlignment", displayName: "Alignment", value: "left", mode: powerbi.visuals.AlignmentGroupMode.Horizonal });
    public name = "rowHeadersGroup";
    public displayName = "Text";
    public slices = [this.font, this.textColor, this.backgroundColor, this.brandedRowColor, this.textAlignment];
}

class RowHeadersCard extends FormattingSettingsCompositeCard {
    public rowHeadersGroup: RowHeadersGroup;
    public groups: FormattingSettingsCard[];
    public name = "rowHeaders";
    public displayName = "Row Headers";
    constructor() {
        super();
        this.rowHeadersGroup = new RowHeadersGroup();
        this.groups = [this.rowHeadersGroup];
    }
}

// --- Row Grand Total ---
class RowGrandTotalGroup extends FormattingSettingsCard {
    public font = new formattingSettings.FontControl({
        name: "font", displayName: "Font",
        fontFamily: new formattingSettings.FontPicker({ name: "fontFamily", value: "Segoe UI" }),
        fontSize: new formattingSettings.NumUpDown({ name: "fontSize", value: 9, options: { minValue: 8, maxValue: 72, step: 1 } as any }),
        bold: new formattingSettings.ToggleSwitch({ name: "bold", value: true }),
        italic: new formattingSettings.ToggleSwitch({ name: "italic", value: false }),
        underline: new formattingSettings.ToggleSwitch({ name: "underline", value: false })
    });
    public textColor = new formattingSettings.ColorPicker({ name: "textColor", displayName: "Text color", value: { value: "#1E2323" } });
    public backgroundColor = new formattingSettings.ColorPicker({ name: "backgroundColor", displayName: "Background color", value: { value: "#FFFFFF" } });
    public applyToLabels = new formattingSettings.ToggleSwitch({ name: "applyToLabels", displayName: "Apply to labels", value: false });
    public name = "rowGrandTotalGroup";
    public displayName = "Values";
    public slices = [this.font, this.textColor, this.backgroundColor, this.applyToLabels];
}

class RowGrandTotalCard extends FormattingSettingsCompositeCard {
    public rowGrandTotalGroup: RowGrandTotalGroup;
    public groups: FormattingSettingsCard[];
    public name = "rowGrandTotal";
    public displayName = "Row grand total";
    constructor() {
        super();
        this.rowGrandTotalGroup = new RowGrandTotalGroup();
        this.groups = [this.rowGrandTotalGroup];
    }
}

// --- Specific column ---
export class MeasureCard extends FormattingSettingsCard {
    // ← добавлены типы
    // Header
    public headerTextColor: formattingSettings.ColorPicker;
    public headerBackgroundColor: formattingSettings.ColorPicker;
    public headerAlignment: formattingSettings.AlignmentGroup;
    // Total
    public totalTextColor: formattingSettings.ColorPicker;
    public totalBackgroundColor: formattingSettings.ColorPicker;
    public totalAlignment: formattingSettings.AlignmentGroup;
    // Values
    public valuesTextColor: formattingSettings.ColorPicker;
    public valuesBackgroundColor: formattingSettings.ColorPicker;
    public valuesAlignment: formattingSettings.AlignmentGroup;

    constructor(measureName: string, displayName: string) {
        super();
        this.name = measureName;
        this.displayName = displayName;
        const prefix = measureName;

        this.headerTextColor = new formattingSettings.ColorPicker({
            name: `${prefix}_header_textColor`,
            displayName: "Header Text color",
            value: { value: "" }
        });
        this.headerBackgroundColor = new formattingSettings.ColorPicker({
            name: `${prefix}_header_backgroundColor`,
            displayName: "Header Background color",
            value: { value: "" }
        });
        this.headerAlignment = new formattingSettings.AlignmentGroup({
            name: `${prefix}_header_alignment`,
            displayName: "Header Alignment",
            value: "",
            mode: powerbi.visuals.AlignmentGroupMode.Horizonal
        });

        this.totalTextColor = new formattingSettings.ColorPicker({
            name: `${prefix}_total_textColor`,
            displayName: "Total Text color",
            value: { value: "" }
        });
        this.totalBackgroundColor = new formattingSettings.ColorPicker({
            name: `${prefix}_total_backgroundColor`,
            displayName: "Total Background color",
            value: { value: "" }
        });
        this.totalAlignment = new formattingSettings.AlignmentGroup({
            name: `${prefix}_total_alignment`,
            displayName: "Total Alignment",
            value: "",
            mode: powerbi.visuals.AlignmentGroupMode.Horizonal
        });

        this.valuesTextColor = new formattingSettings.ColorPicker({
            name: `${prefix}_values_textColor`,
            displayName: "Values Text color",
            value: { value: "" }
        });
        this.valuesBackgroundColor = new formattingSettings.ColorPicker({
            name: `${prefix}_values_backgroundColor`,
            displayName: "Values Background color",
            value: { value: "" }
        });
        this.valuesAlignment = new formattingSettings.AlignmentGroup({
            name: `${prefix}_values_alignment`,
            displayName: "Values Alignment",
            value: "",
            mode: powerbi.visuals.AlignmentGroupMode.Horizonal
        });

        this.slices = [
            this.headerTextColor,
            this.headerBackgroundColor,
            this.headerAlignment,
            this.valuesTextColor,
            this.valuesBackgroundColor,
            this.valuesAlignment,
            this.totalTextColor,
            this.totalBackgroundColor,
            this.totalAlignment
        ];
    }
}

class SpecificColumnCard extends FormattingSettingsCompositeCard {
    public groups: formattingSettings.Cards[];
    public name = "specificColumn";
    public displayName = "Specific column";
    constructor() {
        super();
        const groups: MeasureCard[] = [];
        for (let i = 0; i < 30; i++) {
            groups.push(new MeasureCard(`measure_${i}`, `Measure ${i + 1}`));
        }
        this.groups = groups;
    }
    public updateGroups(measureNames: string[]): void {
        const groups = this.groups as MeasureCard[];
        for (let i = 0; i < groups.length; i++) groups[i].visible = false;
        for (let i = 0; i < measureNames.length && i < groups.length; i++) {
            groups[i].visible = true;
            groups[i].displayName = measureNames[i];
        }
    }
}

// --- Column Width ---
export class ColumnWidthCard extends FormattingSettingsCard {
    public name = "columnWidth";
    public displayName = "Column Width";
    public slices: formattingSettings.Slice[] = [];

    private rowHeaderWidth: formattingSettings.NumUpDown;
    private measureWidths: formattingSettings.NumUpDown[] = [];

    constructor() {
        super();
        this.rowHeaderWidth = new formattingSettings.NumUpDown({
            name: "rowHeader_width",
            displayName: "Row header width",
            value: 300,
            options: { minValue: 50, maxValue: 500, step: 5 } as any
        });
        this.slices.push(this.rowHeaderWidth);

        for (let i = 0; i < 30; i++) {
            const widthSlice = new formattingSettings.NumUpDown({
                name: `measure_${i}_width`,
                displayName: `Measure ${i + 1} width`,
                value: 120,
                options: { minValue: 50, maxValue: 500, step: 5 } as any
            });
            this.measureWidths.push(widthSlice);
            this.slices.push(widthSlice);
        }
    }

    public updateMeasureWidths(measureNames: string[]): void {
        for (let i = 0; i < this.measureWidths.length; i++) {
            if (i < measureNames.length) {
                this.measureWidths[i].displayName = `${measureNames[i]} width`;
                this.measureWidths[i].visible = true;
            } else {
                this.measureWidths[i].visible = false;
            }
        }
        this.slices = [this.rowHeaderWidth, ...this.measureWidths];
    }

    public getRowHeaderWidth(): number { return this.rowHeaderWidth.value; }

    public getMeasureWidth(i: number): number {
        return i < this.measureWidths.length ? this.measureWidths[i].value : 120;
    }
}

// --- Conditional Formatting ---
export const CF_RULES_PER_MEASURE = 3;
export const CF_MAX_MEASURES = 30;

export enum CFRuleOperator {
    Greater = "Greater",
    GreaterOrEqual = "GreaterOrEqual",
    Less = "Less",
    LessOrEqual = "LessOrEqual",
    Equal = "Equal",
    NotEqual = "NotEqual",
    Between = "Between"
}

export enum CFTextOperator {
    Equals = "Equals",
    NotEquals = "NotEquals",
    Contains = "Contains",
    StartsWith = "StartsWith",
    EndsWith = "EndsWith"
}

export interface CFMeasureInfo {
    name: string;
    isNumeric: boolean;
}

class MeasureCFRuleCard extends FormattingSettingsCard {
    // ← добавлены типы
    public enabled: formattingSettings.ToggleSwitch;
    public operator: formattingSettings.ItemDropdown;
    public value1: formattingSettings.TextInput;
    public value2: formattingSettings.TextInput;
    public textOperator: formattingSettings.ItemDropdown;
    public textValue: formattingSettings.TextInput;
    public backgroundColor: formattingSettings.ColorPicker;
    public fontColor: formattingSettings.ColorPicker;

    constructor(measureIndex: number, ruleIndex: number) {
        super();
        const p = `cf_measure_${measureIndex}_rule_${ruleIndex}`;
        const prefix = `Rule ${ruleIndex + 1}`;
        this.name = p;
        this.displayName = prefix;

        this.enabled = new formattingSettings.ToggleSwitch({
            name: `${p}_enabled`,
            displayName: `${prefix} — Enable`,
            value: false
        });

        this.operator = new formattingSettings.ItemDropdown({
            name: `${p}_operator`,
            displayName: `${prefix} — Operator`,
            items: [
                { value: CFRuleOperator.GreaterOrEqual, displayName: "≥" },
                { value: CFRuleOperator.Greater,        displayName: ">" },
                { value: CFRuleOperator.LessOrEqual,    displayName: "≤" },
                { value: CFRuleOperator.Less,           displayName: "<" },
                { value: CFRuleOperator.Equal,          displayName: "=" },
                { value: CFRuleOperator.NotEqual,       displayName: "≠" },
                { value: CFRuleOperator.Between,        displayName: "Between" }
            ],
            value: { value: CFRuleOperator.GreaterOrEqual, displayName: "≥" }
        });

        this.value1 = new formattingSettings.TextInput({
            name: `${p}_value1`,
            displayName: `${prefix} — Threshold`,
            placeholder: "0.65",
            value: "0"
        });

        this.value2 = new formattingSettings.TextInput({
            name: `${p}_value2`,
            displayName: `${prefix} — Upper threshold`,
            placeholder: "0.65",
            value: "0"
        });

        this.textOperator = new formattingSettings.ItemDropdown({
            name: `${p}_textOperator`,
            displayName: `${prefix} — Operator`,
            items: [
                { value: CFTextOperator.Equals,     displayName: "equals" },
                { value: CFTextOperator.NotEquals,  displayName: "not equals" },
                { value: CFTextOperator.Contains,   displayName: "contains" },
                { value: CFTextOperator.StartsWith, displayName: "starts with" },
                { value: CFTextOperator.EndsWith,   displayName: "ends with" }
            ],
            value: { value: CFTextOperator.Equals, displayName: "equals" }
        });

        this.textValue = new formattingSettings.TextInput({
            name: `${p}_textValue`,
            displayName: `${prefix} — Text value`,
            placeholder: "Not ok",
            value: ""
        });

        this.backgroundColor = new formattingSettings.ColorPicker({
            name: `${p}_backgroundColor`,
            displayName: `${prefix} — Background`,
            value: { value: "" }
        });

        this.fontColor = new formattingSettings.ColorPicker({
            name: `${p}_fontColor`,
            displayName: `${prefix} — Font color`,
            value: { value: "" }
        });

        this.slices = [
            this.enabled,
            this.operator, this.value1, this.value2,
            this.textOperator, this.textValue,
            this.backgroundColor, this.fontColor
        ];
    }
}

export class MeasureCFGroupCard extends FormattingSettingsCard {
    declare public name: string;
    declare public displayName: string;
    public slices: formattingSettings.Slice[] = [];
    public numericSliceNames: string[] = [];
    public textSliceNames: string[] = [];

    constructor(measureIndex: number) {
        super();
        this.name = `cf_measure_${measureIndex}`;
        this.displayName = `Measure ${measureIndex + 1}`;

        for (let r = 0; r < CF_RULES_PER_MEASURE; r++) {
            const rule = new MeasureCFRuleCard(measureIndex, r);
            this.slices.push(...(rule.slices ?? []));

            const p = `cf_measure_${measureIndex}_rule_${r}`;
            this.numericSliceNames.push(`${p}_operator`, `${p}_value1`, `${p}_value2`);
            this.textSliceNames.push(`${p}_textOperator`, `${p}_textValue`);
        }
    }

    public updateForMeasure(info: CFMeasureInfo): void {
        this.displayName = info.name;
        for (const slice of this.slices) {
            const name = (slice as any).name as string;
            if (this.numericSliceNames.indexOf(name) >= 0) {
                slice.visible = info.isNumeric;
            } else if (this.textSliceNames.indexOf(name) >= 0) {
                slice.visible = !info.isNumeric;
            }
        }
    }
}

export class ConditionalFormattingCard extends FormattingSettingsCompositeCard {
    public groups: MeasureCFGroupCard[] = [];
    public name = "conditionalFormatting";
    public displayName = "Conditional formatting";

    constructor() {
        super();
        for (let i = 0; i < CF_MAX_MEASURES; i++) {
            this.groups.push(new MeasureCFGroupCard(i));
        }
    }

    public updateGroups(measures: CFMeasureInfo[]): void {
        for (let i = 0; i < this.groups.length; i++) {
            const g = this.groups[i];
            if (i >= measures.length) {
                g.visible = false;
                continue;
            }
            g.visible = true;
            g.updateForMeasure(measures[i]);
        }
    }
}

// --- Модель ---
export class VisualSettings extends FormattingSettingsModel {
    public subTotals = new SubtotalsCard();
    public grid = new GridCard();
    public values = new ValuesCard();
    public columnHeaders = new ColumnHeadersCard();
    public rowHeaders = new RowHeadersCard();
    public rowGrandTotal = new RowGrandTotalCard();
    public specificColumn = new SpecificColumnCard();
    public columnWidth = new ColumnWidthCard();
    public borders = new BordersCard();
    public conditionalFormatting = new ConditionalFormattingCard();

    constructor() {
        super();
        this.cards = [
            this.subTotals,
            this.grid,
            this.values,
            this.columnHeaders,
            this.rowHeaders,
            this.rowGrandTotal,
            this.specificColumn,
            this.columnWidth,
            this.borders,
            this.conditionalFormatting
        ];
    }
}