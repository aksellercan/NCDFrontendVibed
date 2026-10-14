export function convertToNumber(x: String, defaultValue: number): number {
    let y = Number(x);
    if (Number.isNaN(y)) {
        return defaultValue;
    }
    return y;
}

export function formatBytes(bytes: number): string {
    if (bytes == null || Number.isNaN(bytes)) return "N/A";
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(iso: string | null | undefined): string {
    if (!iso) return "Never";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleString();
}
