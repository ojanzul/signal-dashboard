import type { Candle } from "./marketdata";
import type { IndicatorSnapshot } from "./indicators";

export interface LLMSignal {
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number; // 0-100
  reasoning: string;
}

const SYSTEM_PROMPT = `Kamu adalah analis price action untuk trading forex/crypto/gold.
Kamu akan diberi 100 candle terakhir (OHLC) beserta indikator teknikal saat ini.
Analisa dan berikan HANYA JSON dengan format persis:
{"signal": "BUY" | "SELL" | "HOLD", "confidence": <0-100>, "reasoning": "<1-2 kalimat, dalam Bahasa Indonesia>"}

PENTING -- kejujuran epistemik:
- Ini bukan tebakan pasti. Kalau kondisi pasar ambigu/campur aduk, JAWAB "HOLD" dengan confidence rendah (di bawah 40), JANGAN dipaksakan BUY/SELL supaya kelihatan "ada sinyal".
- confidence tinggi (>70) HANYA kalau price action & indikator benar-benar selaras kuat (mis. tren jelas + momentum + posisi Bollinger konsisten).
- Jangan gunakan superlatif ("pasti", "dijamin", dll) di reasoning -- ini analisa probabilistik, bukan kepastian.
Jangan tambahkan teks lain di luar JSON.`;

/**
 * Panggil LLM lewat OpenCode Zen (AI gateway dari opencode.ai) sebagai "analis"
 * yang menghasilkan sinyal terstruktur. Zen meneruskan request ke Claude
 * menggunakan format yang kompatibel dengan Anthropic Messages API, jadi
 * struktur request/response di bawah ini tidak berubah -- yang beda hanya
 * base URL dan API key (didapat dari dashboard workspace opencode.ai).
 */
export async function getLLMSignal(
  symbol: string,
  candles: Candle[],
  indicators: IndicatorSnapshot
): Promise<LLMSignal> {
  const apiKey = process.env.OPENCODE_API_KEY;
  if (!apiKey) {
    throw new Error("OPENCODE_API_KEY belum di-set di environment");
  }

  const recentCandles = candles.slice(-30); // kirim 30 candle mentah terakhir (ringkas token)
  const userPrompt = `Simbol: ${symbol}

30 candle terakhir (kronologis, lama->baru):
${JSON.stringify(recentCandles)}

Indikator teknikal saat ini (dihitung dari 100 candle):
${JSON.stringify(indicators, null, 2)}

Berikan analisamu dalam format JSON yang diminta.`;

  const res = await fetch("https://opencode.ai/zen/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenCode Zen API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";

  let parsed: LLMSignal;
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Gagal parse respons LLM sebagai JSON: ${text.slice(0, 300)}`);
  }

  if (!["BUY", "SELL", "HOLD"].includes(parsed.signal)) {
    throw new Error(`Signal tidak valid dari LLM: ${parsed.signal}`);
  }

  return parsed;
}
