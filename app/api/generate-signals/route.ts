import { NextResponse } from "next/server";
import { SYMBOLS, TIMEFRAME, CANDLES_FOR_ANALYSIS } from "@/lib/config";
import { fetchCandles } from "@/lib/marketdata";
import { computeLatestIndicators } from "@/lib/indicators";
import { getLLMSignal } from "@/lib/llm";
import { getSupabaseServerClient } from "@/lib/supabase";

export const maxDuration = 60; // Vercel: LLM call ke 5 simbol butuh waktu

export async function POST() {
  const supabase = getSupabaseServerClient();
  const hasil: any[] = [];

  for (const { code, twelveDataSymbol } of SYMBOLS) {
    try {
      const candles = await fetchCandles(twelveDataSymbol, TIMEFRAME, CANDLES_FOR_ANALYSIS);
      if (candles.length < 30) {
        hasil.push({ symbol: code, error: "Data candle tidak cukup" });
        continue;
      }

      const indicators = computeLatestIndicators(candles);
      const llmResult = await getLLMSignal(code, candles, indicators);
      const lastCandle = candles[candles.length - 1];
      const recentCandles = candles.slice(-30);

      const { error } = await supabase.from("signals").insert({
        symbol: code,
        timeframe: TIMEFRAME,
        price_at_signal: lastCandle.close,
        indicators,
        candles_snapshot: recentCandles,
        llm_signal: llmResult.signal,
        llm_confidence: llmResult.confidence,
        llm_reasoning: llmResult.reasoning,
      });

      if (error) throw new Error(error.message);

      hasil.push({ symbol: code, ...llmResult, price: lastCandle.close });
    } catch (err: any) {
      hasil.push({ symbol: code, error: err.message });
    }
  }

  return NextResponse.json({ results: hasil });
}
