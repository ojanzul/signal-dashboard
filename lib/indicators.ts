import type { Candle } from "./marketdata";

export interface IndicatorSnapshot {
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  atr: number | null;
  bbWidth: number | null;
  bbPosition: number | null;
  adx: number | null;
  stochK: number | null;
  stochD: number | null;
}

function sma(values: number[], window: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null;
    const slice = values.slice(i - window + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / window;
  });
}

function ema(values: number[], span: number): number[] {
  const alpha = 2 / (span + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(alpha * values[i] + (1 - alpha) * out[i - 1]);
  }
  return out;
}

function rollingStd(values: number[], window: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null;
    const slice = values.slice(i - window + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / window;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / window;
    return Math.sqrt(variance);
  });
}

function computeRSI(closes: number[], window = 14): (number | null)[] {
  const deltas = closes.map((c, i) => (i === 0 ? 0 : c - closes[i - 1]));
  const gains = deltas.map((d) => (d > 0 ? d : 0));
  const losses = deltas.map((d) => (d < 0 ? -d : 0));
  const avgGain = sma(gains, window);
  const avgLoss = sma(losses, window);
  return avgGain.map((g, i) => {
    const l = avgLoss[i];
    if (g === null || l === null) return null;
    if (l === 0) return 100;
    const rs = g / l;
    return 100 - 100 / (1 + rs);
  });
}

function computeMACD(closes: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macd = closes.map((_, i) => emaFast[i] - emaSlow[i]);
  const macdSignal = ema(macd, signal);
  const macdHist = macd.map((m, i) => m - macdSignal[i]);
  return { macd, macdSignal, macdHist };
}

function computeATR(candles: Candle[], window = 14): (number | null)[] {
  const tr = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prevClose = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
  });
  return sma(tr, window);
}

function computeBollinger(closes: number[], window = 20, nStd = 2) {
  const mid = sma(closes, window);
  const std = rollingStd(closes, window);
  return closes.map((c, i) => {
    const m = mid[i];
    const s = std[i];
    if (m === null || s === null) return { bbWidth: null, bbPosition: null };
    const upper = m + nStd * s;
    const lower = m - nStd * s;
    const bbWidth = (upper - lower) / m;
    const bbPosition = upper === lower ? null : (c - lower) / (upper - lower);
    return { bbWidth, bbPosition };
  });
}

function computeADX(candles: Candle[], window = 14): (number | null)[] {
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];
  for (let i = 1; i < candles.length; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }
  const tr = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prevClose = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
  });
  const atr = sma(tr, window);
  const plusDI = sma(plusDM, window).map((v, i) => (v === null || !atr[i] ? null : (100 * v) / (atr[i] as number)));
  const minusDI = sma(minusDM, window).map((v, i) => (v === null || !atr[i] ? null : (100 * v) / (atr[i] as number)));
  const dx = plusDI.map((p, i) => {
    const m = minusDI[i];
    if (p === null || m === null || p + m === 0) return null;
    return (100 * Math.abs(p - m)) / (p + m);
  });
  return sma(
    dx.map((v) => v ?? 0),
    window
  );
}

function computeStochastic(candles: Candle[], window = 14, smoothK = 3) {
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const percentK = candles.map((c, i) => {
    if (i < window - 1) return null;
    const hh = Math.max(...highs.slice(i - window + 1, i + 1));
    const ll = Math.min(...lows.slice(i - window + 1, i + 1));
    if (hh === ll) return null;
    return (100 * (c.close - ll)) / (hh - ll);
  });
  const stochK = sma(
    percentK.map((v) => v ?? NaN),
    smoothK
  ).map((v) => (v !== null && !Number.isNaN(v) ? v : null));
  const stochD = sma(
    stochK.map((v) => v ?? NaN),
    smoothK
  ).map((v) => (v !== null && !Number.isNaN(v) ? v : null));
  return { stochK, stochD };
}

/** Hitung semua indikator dan kembalikan snapshot untuk CANDLE TERAKHIR saja
 * (yang dipakai sebagai konteks "kondisi pasar saat ini" ke LLM). */
export function computeLatestIndicators(candles: Candle[]): IndicatorSnapshot {
  const closes = candles.map((c) => c.close);
  const last = candles.length - 1;

  const rsi = computeRSI(closes);
  const { macd, macdSignal, macdHist } = computeMACD(closes);
  const atr = computeATR(candles);
  const bollinger = computeBollinger(closes);
  const adx = computeADX(candles);
  const { stochK, stochD } = computeStochastic(candles);

  return {
    rsi: rsi[last],
    macd: macd[last],
    macdSignal: macdSignal[last],
    macdHist: macdHist[last],
    atr: atr[last],
    bbWidth: bollinger[last].bbWidth,
    bbPosition: bollinger[last].bbPosition,
    adx: adx[last],
    stochK: stochK[last],
    stochD: stochD[last],
  };
}
