import { NextRequest, NextResponse } from "next/server";
import { SYMBOLS, TIMEFRAME, VALIDATION_HORIZON_HOURS, VALIDATION_THRESHOLD_PCT } from "@/lib/config";
import { fetchCandles } from "@/lib/marketdata";
import { getSupabaseServerClient } from "@/lib/supabase";

export const maxDuration = 60;

function tentukanOutcome(signal: string, priceAtSignal: number, priceAfter: number): "BENAR" | "SALAH" | "NETRAL" {
  const pctChange = ((priceAfter - priceAtSignal) / priceAtSignal) * 100;

  if (signal === "HOLD") {
    // HOLD tidak dinilai benar/salah secara ketat -- itu "tidak bertaruh".
    // Kita tetap catat sebagai NETRAL supaya transparan, bukan dihitung sebagai "menang".
    return "NETRAL";
  }
  if (signal === "BUY") {
    if (pctChange >= VALIDATION_THRESHOLD_PCT) return "BENAR";
    if (pctChange <= -VALIDATION_THRESHOLD_PCT) return "SALAH";
    return "NETRAL";
  }
  // signal === "SELL"
  if (pctChange <= -VALIDATION_THRESHOLD_PCT) return "BENAR";
  if (pctChange >= VALIDATION_THRESHOLD_PCT) return "SALAH";
  return "NETRAL";
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = getSupabaseServerClient();

  const cutoff = new Date(Date.now() - VALIDATION_HORIZON_HOURS * 60 * 60 * 1000).toISOString();

  const { data: pendingSignals, error: fetchError } = await supabase
    .from("signals")
    .select("*")
    .is("validated_at", null)
    .lte("created_at", cutoff);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!pendingSignals || pendingSignals.length === 0) {
    return NextResponse.json({ message: "Tidak ada sinyal yang perlu divalidasi saat ini." });
  }

  // Ambil harga terkini untuk tiap simbol yang punya sinyal pending (1x fetch per simbol, bukan per sinyal)
  const symbolsNeeded = [...new Set(pendingSignals.map((s) => s.symbol))];
  const currentPrices: Record<string, number> = {};

  for (const symbolCode of symbolsNeeded) {
    const symbolMeta = SYMBOLS.find((s) => s.code === symbolCode);
    if (!symbolMeta) continue;
    try {
      const candles = await fetchCandles(symbolMeta.twelveDataSymbol, TIMEFRAME, 2);
      currentPrices[symbolCode] = candles[candles.length - 1].close;
    } catch (err) {
      console.error(`Gagal ambil harga terkini untuk ${symbolCode}`, err);
    }
  }

  const hasilValidasi: any[] = [];

  for (const sig of pendingSignals) {
    const priceAfter = currentPrices[sig.symbol];
    if (priceAfter === undefined) continue;

    const outcome = tentukanOutcome(sig.llm_signal, sig.price_at_signal, priceAfter);

    const { error: updateError } = await supabase
      .from("signals")
      .update({
        validated_at: new Date().toISOString(),
        price_after: priceAfter,
        outcome,
      })
      .eq("id", sig.id);

    if (!updateError) {
      hasilValidasi.push({ id: sig.id, symbol: sig.symbol, signal: sig.llm_signal, outcome });
    }
  }

  return NextResponse.json({ divalidasi: hasilValidasi.length, detail: hasilValidasi });
}
