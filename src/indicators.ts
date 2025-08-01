import { normalize } from "./utils.js";

type numberInString = string | number;

type Kline = [number, numberInString, numberInString, numberInString, numberInString, numberInString, number, numberInString, number, numberInString, numberInString, numberInString];

export const KLINE_FEATURES: number = 16;

export function calculateATR(klines: Kline[], period: number = 14): number[] {
    const trs: number[] = [];
    const atr: number[] = [];

    for (let i = 0; i < klines.length; i++) {
        const high = Number(klines[i][2]);
        const low = Number(klines[i][3]);
        const closePrev = i > 0 ? Number(klines[i - 1][4]) : high;

        const tr = Math.max(high - low, Math.abs(high - closePrev), Math.abs(low - closePrev));
        trs.push(tr);
    }

    // Simple Moving Average for first ATR value
    let sumTR = 0;
    for (let i = 0; i < klines.length; i++) {
        if (i < period) {
            sumTR += trs[i];
            atr.push(NaN); // not enough data
        } else if (i === period) {
            sumTR += trs[i];
            const firstATR = sumTR / period;
            atr.push(firstATR);
        } else {
            // Wilder's smoothing method
            const prevATR = atr[atr.length - 1]!;
            const currentATR = (prevATR * (period - 1) + trs[i]) / period;
            atr.push(currentATR);
        }
    }

    return atr;
}

export function calculateEMA(data: number[], period: number): number[] {
    const ema: number[] = [];
    const k = 2 / (period + 1);
    let prev = data[0];
    for (let i = 0; i < data.length; i++) {
        if (i === 0) {
            ema.push(prev);
        } else {
            prev = data[i] * k + prev * (1 - k);
            ema.push(prev);
        }
    }
    return ema;
}

export function calculateRSI(prices: number[], period: number = 14): number[] {
    if (prices.length < period + 1) {
        throw new Error("Cannot calculate RSI");
    }

    let totalGain = 0;
    let totalLoss = 0;

    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) {
            totalGain += change;
        } else if (change < 0) {
            totalLoss += Math.abs(change);
        }
    }

    const initialAverageGain = totalGain / period;
    const initialAverageLoss = totalLoss / period;
    const initialRS = initialAverageGain / initialAverageLoss;
    const initialRSI = 100 - 100 / (1 + initialRS);

    let previousGain = initialAverageGain;
    let previousLoss = initialAverageLoss;
    let rsi: number[] = [initialRSI];

    for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];

        if (change > 0) {
            previousGain = (previousGain * (period - 1) + change) / period;
            previousLoss = (previousLoss * (period - 1)) / period;
        } else if (change < 0) {
            previousGain = (previousGain * (period - 1)) / period;
            previousLoss = (previousLoss * (period - 1) + Math.abs(change)) / period;
        }

        const rs = previousGain / previousLoss;
        const currentRSI = 100 - 100 / (1 + rs);
        rsi.push(currentRSI);
    }

    return rsi;
}

export function calculateMACD(
    prices: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
    const emaFast = calculateEMA(prices, fastPeriod);
    const emaSlow = calculateEMA(prices, slowPeriod);
    const macd: (number | null)[] = [];
    const signal: (number | null)[] = [];
    const histogram: (number | null)[] = [];

    for (let i = 0; i < prices.length; i++) {
        const fast = emaFast[i];
        const slow = emaSlow[i];
        if (fast != null && slow != null) {
            macd[i] = fast - slow;
        } else {
            macd[i] = null;
        }
    }

    const macdCleaned = macd.map((v) => v ?? 0);
    const signalLine = calculateEMA(macdCleaned, signalPeriod);

    for (let i = 0; i < prices.length; i++) {
        signal[i] = signalLine[i] ?? null;
        histogram[i] = macd[i] != null && signal[i] != null ? macd[i]! - signal[i]! : null;
    }
    return { macd, signal, histogram };
}

export function calculateMFI(klines: Kline[], period: number = 14): (number | null)[] {
    if (klines.length < period) {
        return Array(klines.length).fill(null);
    }

    const mfi: (number | null)[] = Array(klines.length).fill(null);
    const positiveMoneyFlows: number[] = [];
    const negativeMoneyFlows: number[] = [];

    for (let i = 1; i < klines.length; i++) {
        const high = Number(klines[i][2]);
        const low = Number(klines[i][3]);
        const close = Number(klines[i][4]);
        const volume = Number(klines[i][5]);

        const previousHigh = Number(klines[i - 1][2]);
        const previousLow = Number(klines[i - 1][3]);
        const previousClose = Number(klines[i - 1][4]);

        const typicalPrice = (high + low + close) / 3;
        const previousTypicalPrice = (previousHigh + previousLow + previousClose) / 3;
        const moneyFlow = typicalPrice * volume;

        if (typicalPrice > previousTypicalPrice) {
            positiveMoneyFlows.push(moneyFlow);
            if (negativeMoneyFlows.length >= period) {
                negativeMoneyFlows.shift();
            }
        } else if (typicalPrice < previousTypicalPrice) {
            negativeMoneyFlows.push(moneyFlow);
            if (positiveMoneyFlows.length >= period) {
                positiveMoneyFlows.shift();
            }
        } else {
            if (positiveMoneyFlows.length >= period) {
                positiveMoneyFlows.shift();
            }
            if (negativeMoneyFlows.length >= period) {
                negativeMoneyFlows.shift();
            }
        }

        if (i >= period) {
            const periodPositiveMoneyFlow = positiveMoneyFlows.reduce((sum, val) => sum + val, 0);
            const periodNegativeMoneyFlow = negativeMoneyFlows.reduce((sum, val) => sum + val, 0);

            if (periodNegativeMoneyFlow !== 0) {
                const moneyRatio = periodPositiveMoneyFlow / periodNegativeMoneyFlow;
                mfi[i] = 100 - 100 / (1 + moneyRatio);
            } else {
                mfi[i] = 100; // If no negative money flow, MFI is 100
            }
        }
    }

    return mfi;
}

export function addNoiseToKlines(klines: Kline[], percent = 0.0005): Kline[] {
    return klines.map(([openTime, open, high, low, close, volume, ...rest]) => {
        const rand = () => (Math.random() * 2 - 1) * percent;

        const noisyOpen = +open * (1 + rand());
        const noisyHigh = +high * (1 + rand());
        const noisyLow = +low * (1 + rand());
        const noisyClose = +close * (1 + rand());
        const noisyVolume = +volume * (1 + rand());

        return [openTime, noisyOpen.toString(), noisyHigh.toString(), noisyLow.toString(), noisyClose.toString(), noisyVolume.toString(), ...rest] as Kline;
    });
}

export function calculateIndicators(
    klines: Kline[],
    parameters: {
        ultraSlowEmaPeriod: number;
        superSlowEmaPeriod: number;
        slowEmaPeriod: number;
        fastEmaPeriod: number;
        slowRsiPeriod: number;
        fastRsiPeriod: number;
        mfiPeriod: number;
        atrPeriod: number;
    } = {
        ultraSlowEmaPeriod: 200,
        superSlowEmaPeriod: 100,
        slowEmaPeriod: 25,
        fastEmaPeriod: 7,
        slowRsiPeriod: 24,
        fastRsiPeriod: 7,
        mfiPeriod: 14,
        atrPeriod: 14
    }
) {
    const { ultraSlowEmaPeriod, superSlowEmaPeriod, slowEmaPeriod, fastEmaPeriod, slowRsiPeriod, fastRsiPeriod, mfiPeriod, atrPeriod } = parameters;

    const maxPeriodRequired = Math.max(ultraSlowEmaPeriod, fastEmaPeriod, slowEmaPeriod, superSlowEmaPeriod, fastRsiPeriod + 1, slowRsiPeriod + 1, mfiPeriod, atrPeriod);

    if (klines.length <= maxPeriodRequired) {
        throw new Error("Not enough klines to compute indicators.");
    }

    const closePrices = klines.map((k) => Number(k[4]));
    const volumes = klines.map((k) => Number(k[5]));

    const ultraSlowEma = calculateEMA(closePrices, ultraSlowEmaPeriod);
    const superSlowEma = calculateEMA(closePrices, superSlowEmaPeriod);
    const slowEma = calculateEMA(closePrices, slowEmaPeriod);
    const fastEma = calculateEMA(closePrices, fastEmaPeriod);
    const slowRsi = calculateRSI(closePrices, slowRsiPeriod);
    const fastRsi = calculateRSI(closePrices, fastRsiPeriod);
    const { macd, signal, histogram } = calculateMACD(closePrices);
    const mfi = calculateMFI(klines, mfiPeriod);
    const atr = calculateATR(klines, atrPeriod);

    const minPrice = Math.min(...klines.map((k) => Number(k[3])));
    const maxPrice = Math.max(...klines.map((k) => Number(k[2])));
    const minVolume = Math.min(...volumes);
    const maxVolume = Math.max(...volumes);

    const validMacd = macd.filter((v): v is number => v !== null);
    const minMACD = validMacd.length ? Math.min(...validMacd) : 0;
    const maxMACD = validMacd.length ? Math.max(...validMacd) : 0;

    const validSignal = signal.filter((v): v is number => v !== null);
    const minSignal = validSignal.length ? Math.min(...validSignal) : 0;
    const maxSignal = validSignal.length ? Math.max(...validSignal) : 0;

    const validHistogram = histogram.filter((v): v is number => v !== null);
    const minHistogram = validHistogram.length ? Math.min(...validHistogram) : 0;
    const maxHistogram = validHistogram.length ? Math.max(...validHistogram) : 0;

    return {
        klines,
        closePrices,
        volumes,
        ultraSlowEma,
        superSlowEma,
        slowEma,
        fastEma,
        slowRsi,
        fastRsi,
        macd,
        signal,
        histogram,
        mfi,
        atr,
        minPrice,
        maxPrice,
        minVolume,
        maxVolume,
        minMACD,
        maxMACD,
        minSignal,
        maxSignal,
        minHistogram,
        maxHistogram
    };
}

export function normalizeIndicators(indicators: ReturnType<typeof calculateIndicators>) {
    const {
        klines,
        ultraSlowEma,
        superSlowEma,
        slowEma,
        fastEma,
        slowRsi,
        fastRsi,
        macd,
        signal,
        histogram,
        mfi,
        atr,
        minPrice,
        maxPrice,
        minVolume,
        maxVolume,
        minMACD,
        maxMACD,
        minSignal,
        maxSignal,
        minHistogram,
        maxHistogram
    } = indicators;

    return klines.map((kline, i) => {
        const open = Number(kline[1]);
        const high = Number(kline[2]);
        const low = Number(kline[3]);
        const close = Number(kline[4]);
        const volume = Number(kline[5]);

        const normalizedOpen = normalize(open, minPrice, maxPrice);
        const normalizedHigh = normalize(high, minPrice, maxPrice);
        const normalizedLow = normalize(low, minPrice, maxPrice);
        const normalizedClose = normalize(close, minPrice, maxPrice);
        const normalizedVolume = minVolume === maxVolume ? 0 : (volume - minVolume) / (maxVolume - minVolume);

        const normalizedFastEMA = fastEma[i] != null ? normalize(fastEma[i]!, minPrice, maxPrice) : 0;
        const normalizedSlowEMA = slowEma[i] != null ? normalize(slowEma[i]!, minPrice, maxPrice) : 0;
        const normalizedSuperSlowEMA = superSlowEma[i] != null ? normalize(superSlowEma[i]!, minPrice, maxPrice) : 0;
        const normalizedUltraSlowEMA = ultraSlowEma[i] != null ? normalize(ultraSlowEma[i]!, minPrice, maxPrice) : 0;
        const normalizedFastRSI = fastRsi[i] != null ? fastRsi[i]! / 100 : 0;
        const normalizedSlowRSI = slowRsi[i] != null ? slowRsi[i]! / 100 : 0;
        const normalizedMACD = macd[i] != null ? normalize(macd[i]!, minMACD, maxMACD) : 0;
        const normalizedSignal = signal[i] != null ? normalize(signal[i]!, minSignal, maxSignal) : 0;
        const normalizedHistogram = histogram[i] != null ? normalize(histogram[i]!, minHistogram, maxHistogram) : 0;
        const normalizedMFI = mfi[i] != null ? mfi[i]! / 100 : 0;
        const normalizedATR = atr[i] != null ? normalize(atr[i]!, minPrice, maxPrice) : 0;

        return [
            normalizedOpen,
            normalizedHigh,
            normalizedLow,
            normalizedClose,
            normalizedVolume,
            normalizedFastEMA,
            normalizedSlowEMA,
            normalizedSuperSlowEMA,
            normalizedUltraSlowEMA,
            normalizedFastRSI,
            normalizedSlowRSI,
            normalizedMACD,
            normalizedSignal,
            normalizedHistogram,
            normalizedMFI,
            normalizedATR
        ];
    });
}
