export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Ambil candle historis dari Twelve Data untuk 1 simbol.
 * Perlu TWELVE_DATA_API_KEY di environment (lihat .env.example).
 */
export async function fetchCandles(
  twelveDataSymbol: string,
  interval: string,
  outputsize: number
): Promise<Candle[]> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("TWELVE_DATA_API_KEY belum di-set di environment");
  }

  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", twelveDataSymbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("outputsize", String(outputsize));
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = await res.json();

  if (data.status === "error") {
    throw new Error(`Twelve Data error untuk ${twelveDataSymbol}: ${data.message}`);
  }
  if (!Array.isArray(data.values)) {
    throw new Error(`Respons Twelve Data tidak terduga untuk ${twelveDataSymbol}: ${JSON.stringify(data).slice(0, 200)}`);
  }

  // Twelve Data mengembalikan data dari yang terbaru -> terlama; kita balik
  // supaya kronologis (lama -> baru), lebih natural untuk perhitungan indikator.
  const candles: Candle[] = data.values
    .map((v: any) => ({
      time: v.datetime,
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: v.volume ? parseFloat(v.volume) : 0,
    }))
    .reverse();

  return candles;
}
