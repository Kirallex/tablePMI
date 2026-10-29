export class HeightResizer {
    private static resizing: boolean = false;
    private static container: HTMLElement | null = null;
    private static handle: HTMLElement | null = null;
    private static startY: number = 0;
    private static startHeight: number = 0;
    private static currentHeight: number = 0;
    private static minHeight: number = 100;
    private static onResizeCallback: ((height: number) => void) | null = null;
    private static onCommitCallback: ((height: number) => void) | null = null;

    /**
     * @param container       DOM-элемент, чью высоту меняем
     * @param onResize        вызывается на каждом mousemove (для live-обновления)
     * @param onCommit        вызывается на mouseup — когда изменение высоты завершено.
     *                        Именно тут нужно сохранять высоту через persistProperties.
     */
    public static init(
        container: HTMLElement,
        onResize?: (height: number) => void,
        onCommit?: (height: number) => void
    ): void {
        this.cleanup();
        this.onResizeCallback = onResize || null;
        this.onCommitCallback = onCommit || null;
        this.container = container;
        this.currentHeight = container.offsetHeight;

        if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }

        this.handle = document.createElement('div');
        this.handle.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 8px;
            cursor: ns-resize;
            background-color: transparent;
            z-index: 10000;
            pointer-events: auto;
        `;
        container.appendChild(this.handle);

        this.handle.addEventListener('mousedown', this.onMouseDown);
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
    }

    private static onMouseDown = (e: MouseEvent): void => {
        e.preventDefault();
        if (!this.container) return;
        this.resizing = true;
        this.startY = e.clientY;
        this.startHeight = this.container.offsetHeight;
        this.currentHeight = this.startHeight;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    };

    private static onMouseMove = (e: MouseEvent): void => {
        if (!this.resizing || !this.container) return;
        const diff = e.clientY - this.startY;
        const newHeight = Math.max(this.minHeight, this.startHeight + diff);
        this.currentHeight = newHeight;
        this.container.style.height = newHeight + 'px';
        if (this.onResizeCallback) {
            this.onResizeCallback(newHeight);
        }
    };

    private static onMouseUp = (_e: MouseEvent): void => {
        if (!this.resizing) return;
        this.resizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // Коммитим финальную высоту — теперь её можно сохранить через persistProperties
        if (this.onCommitCallback) {
            this.onCommitCallback(this.currentHeight);
        }
    };

    public static cleanup(): void {
        if (this.handle) {
            this.handle.removeEventListener('mousedown', this.onMouseDown);
            this.handle.remove();
            this.handle = null;
        }
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
        this.container = null;
        this.resizing = false;
        this.onResizeCallback = null;
        this.onCommitCallback = null;
    }
}