import fs from "fs";
import path from "path";

export function randomNumber(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

export function randomInteger(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function clampNumber(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(val, max));
}

export function getIntervalInMilliseconds(interval: string): number {
    const intervalMap: { [key: string]: number } = {
        "1m": 60 * 1000,
        "3m": 3 * 60 * 1000,
        "5m": 5 * 60 * 1000,
        "15m": 15 * 60 * 1000,
        "30m": 30 * 60 * 1000,
        "1h": 60 * 60 * 1000
    };
    return intervalMap[interval];
}

export function saveJSONFile(filePath: string, data: any, overwrite = true) {
    if (!overwrite && fs.existsSync(filePath)) {
        throw new Error(`File already exists: ${filePath}`);
    }

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function readPath(dir: string): { name: string; path: string }[] {
    const base = path.resolve(dir);
    if (!fs.existsSync(base)) return [];

    return fs
        .readdirSync(base)
        .filter((f) => f.endsWith(".json"))
        .map((file) => ({
            name: file.replace(/\.json$/, ""),
            path: path.join(base, file)
        }));
}

export function readJSONFile(path: string) {
    return JSON.parse(fs.readFileSync(path, "utf-8"));
}

export function normalize(value: number, min: number, max: number): number {
    if (max === min) return 0;
    return ((value - min) / (max - min)) * 2 - 1;
}

export function unnormalize(normalized: number, min: number, max: number): number {
    return ((normalized + 1) / 2) * (max - min) + min;
}

export function shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export function chunkArray<T>(array: T[], chunkCount: number): T[][] {
    const chunks: T[][] = Array.from({ length: chunkCount }, () => []);
    array.forEach((item, index) => {
        chunks[index % chunkCount].push(item);
    });
    return chunks;
}

export function validateSeriesRange(series: number[], from: number = -1, to: number = 1): void {
    for (const val of series) {
        if (val < from || val > to) {
            throw new Error(`Input value ${val} is out of range [${from}, ${to}]`);
        }
    }
}

/**
 * Calculates the average net change (trend) over the last `window` values.
 * Measures trend: Positive means rising, negative means falling.
 *
 * @param series - The numeric series to analyze.
 * @param window - Number of recent points to consider.
 * @returns The average signed change between consecutive values.
 */
export function getSeriesTrend(series: number[], window = 2): number {
    if (series.length < 2) return 1;

    window = Math.min(series.length - 1, window);
    const recent = series.slice(-window - 1);

    let netDelta = 0;
    for (let i = 1; i < recent.length; i++) {
        netDelta += recent[i] - recent[i - 1];
    }

    return netDelta / window;
}

/**
 * Returns the absolute change (volatility) over the last `window` values.
 * Measures volatility: How much the series is changing, regardless of direction.
 * @param series - The numeric series to analyze.
 * @param window - Number of recent points to consider.
 * @returns The average magnitude of changes between consecutive values.
 */
export function getSeriesVolatility(series: number[], window = 10): number {
    if (series.length < 2) return 1;

    window = Math.min(series.length - 1, window);
    const recent = series.slice(-window - 1);

    let totalDelta = 0;
    for (let i = 1; i < recent.length; i++) {
        totalDelta += Math.abs(recent[i] - recent[i - 1]);
    }

    return totalDelta / window;
}

export function calculateSharpeRatio(series: number[]): number {
    if (series.length < 2) return 0;
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    const variance = series.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (series.length - 1);
    const stdDev = Math.sqrt(variance);
    return stdDev === 0 ? 0 : mean / stdDev;
}
