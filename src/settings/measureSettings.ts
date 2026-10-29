// measureSettings.ts
export interface IColumnPartSettings {
    textColor: string;
    backgroundColor: string;
    alignment: string;
}

export interface IMeasureSettings {
    header: IColumnPartSettings;
    total: IColumnPartSettings;
    values: IColumnPartSettings;
}

export const defaultColumnPartSettings: IColumnPartSettings = {
    textColor: "#1E2323",
    backgroundColor: "#FFFFFF",
    alignment: "left"
};

export const defaultMeasureSettings: IMeasureSettings = {
    header: { ...defaultColumnPartSettings },
    total: { ...defaultColumnPartSettings },
    values: { ...defaultColumnPartSettings }
};
