// Daftar simbol yang dipantau. "twelveDataSymbol" pakai format Twelve Data
// (forex: "EUR/USD", crypto: "BTC/USD", commodity: "XAU/USD").
export const SYMBOLS = [
  { code: "EURUSD", twelveDataSymbol: "EUR/USD", assetClass: "forex" },
  { code: "GBPUSD", twelveDataSymbol: "GBP/USD", assetClass: "forex" },
  { code: "USDJPY", twelveDataSymbol: "USD/JPY", assetClass: "forex" },
  { code: "XAUUSD", twelveDataSymbol: "XAU/USD", assetClass: "commodity" },
  { code: "BTCUSD", twelveDataSymbol: "BTC/USD", assetClass: "crypto" },
] as const;

export const TIMEFRAME = "1h"; // interval Twelve Data: 1min,5min,15min,1h,4h,1day
export const CANDLES_FOR_ANALYSIS = 100; // jumlah candle historis dikirim ke LLM

// Ambang validasi: sinyal dicek benar/salah setelah N jam berlalu
export const VALIDATION_HORIZON_HOURS = 4;
// Threshold pergerakan harga (dalam %) untuk BUY/SELL dianggap "benar"
export const VALIDATION_THRESHOLD_PCT = 0.15;
