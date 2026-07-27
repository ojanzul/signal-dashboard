const COLORS: Record<string, string> = {
  BUY: "#2FBF71",
  SELL: "#E5484D",
  HOLD: "#5B6672",
};

/** Signature element: meter kepercayaan direpresentasikan sebagai 1 candlestick --
 * tinggi badan = confidence%, warna = arah sinyal, wick tipis di atas/bawah
 * meniru kosakata visual candlestick yang jadi subjek dashboard ini. */
export default function ConfidenceCandle({ signal, confidence }: { signal: string; confidence: number }) {
  const color = COLORS[signal] ?? COLORS.HOLD;
  const heightPct = Math.max(6, confidence); // minimal 6% supaya tetap kelihatan

  return (
    <div className="flex h-24 w-6 flex-col items-center justify-end" title={`Confidence: ${confidence}%`}>
      <div className="relative flex h-full w-full items-end justify-center">
        <div className="absolute h-full w-px opacity-40" style={{ backgroundColor: color }} />
        <div
          className="candle-meter relative w-2.5"
          style={{ height: `${heightPct}%`, backgroundColor: color }}
        />
      </div>
      <span className="mt-1 font-mono text-[10px] text-ink-dim">{confidence}%</span>
    </div>
  );
}
