import { getSupabaseServerClient } from "@/lib/supabase";
import { SYMBOLS } from "@/lib/config";
import GenerateButton from "./GenerateButton";
import ConfidenceCandle from "./ConfidenceCandle";

export const dynamic = "force-dynamic"; // selalu ambil data terbaru, jangan di-cache

const SIGNAL_STYLES: Record<string, string> = {
  BUY: "text-bull border-bull/40 bg-bull/10",
  SELL: "text-bear border-bear/40 bg-bear/10",
  HOLD: "text-hold border-hold/40 bg-hold/10",
};

const OUTCOME_STYLES: Record<string, string> = {
  BENAR: "text-bull",
  SALAH: "text-bear",
  NETRAL: "text-ink-dim",
};

async function getLatestSignals() {
  const supabase = getSupabaseServerClient();
  const latest: Record<string, any> = {};

  for (const { code } of SYMBOLS) {
    const { data } = await supabase
      .from("signals")
      .select("*")
      .eq("symbol", code)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) latest[code] = data;
  }
  return latest;
}

async function getTrackRecord() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("signals")
    .select("symbol, llm_signal, outcome, created_at")
    .not("outcome", "is", null)
    .order("created_at", { ascending: false })
    .limit(30);

  const scored = (data ?? []).filter((d) => d.outcome === "BENAR" || d.outcome === "SALAH");
  const benar = scored.filter((d) => d.outcome === "BENAR").length;
  const winRate = scored.length > 0 ? Math.round((benar / scored.length) * 100) : null;

  return { recent: data ?? [], winRate, totalScored: scored.length };
}

export default async function DashboardPage() {
  const [latestSignals, trackRecord] = await Promise.all([getLatestSignals(), getTrackRecord()]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-start justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-amber">Signal Desk — Eksperimental</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Dashboard Sinyal AI</h1>
        </div>
        <GenerateButton />
      </header>

      <div className="mb-8 rounded-lg border border-amber/30 bg-amber/5 px-4 py-3 text-sm text-ink-dim">
        <strong className="text-amber">Belum tervalidasi.</strong> Sinyal di bawah dihasilkan oleh LLM yang membaca
        price action + indikator — bukan metode yang terbukti akurat. Lihat{" "}
        <strong className="text-ink">Track Record</strong> di bagian bawah sebelum mempercayai sinyal manapun.
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SYMBOLS.map(({ code }) => {
          const sig = latestSignals[code];
          return (
            <div key={code} className="rounded-lg border border-line bg-panel p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-ink">{code}</span>
                {sig && (
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-xs font-medium ${SIGNAL_STYLES[sig.llm_signal]}`}
                  >
                    {sig.llm_signal}
                  </span>
                )}
              </div>

              {!sig ? (
                <p className="text-sm text-ink-dim">Belum ada sinyal. Klik &ldquo;Generate sinyal&rdquo;.</p>
              ) : (
                <div className="flex gap-4">
                  <ConfidenceCandle signal={sig.llm_signal} confidence={sig.llm_confidence} />
                  <div className="flex-1">
                    <p className="font-mono text-lg text-ink">{sig.price_at_signal}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-dim">{sig.llm_reasoning}</p>
                    <p className="mt-2 font-mono text-[10px] text-ink-dim/70">
                      {new Date(sig.created_at).toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-semibold text-ink">Track Record</h2>
        <p className="mb-4 text-sm text-ink-dim">
          {trackRecord.totalScored > 0
            ? `${trackRecord.winRate}% benar dari ${trackRecord.totalScored} sinyal BUY/SELL yang sudah divalidasi.`
            : "Belum ada sinyal yang cukup umur untuk divalidasi (butuh beberapa jam)."}
        </p>

        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel-raised text-ink-dim">
              <tr>
                <th className="px-3 py-2 font-mono text-xs font-medium">Waktu</th>
                <th className="px-3 py-2 font-mono text-xs font-medium">Simbol</th>
                <th className="px-3 py-2 font-mono text-xs font-medium">Sinyal</th>
                <th className="px-3 py-2 font-mono text-xs font-medium">Hasil</th>
              </tr>
            </thead>
            <tbody>
              {trackRecord.recent.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-ink-dim">
                    Belum ada data.
                  </td>
                </tr>
              ) : (
                trackRecord.recent.map((r, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-3 py-2 font-mono text-xs text-ink-dim">
                      {new Date(r.created_at).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-ink">{r.symbol}</td>
                    <td className="px-3 py-2 font-mono text-xs text-ink">{r.llm_signal}</td>
                    <td className={`px-3 py-2 font-mono text-xs font-medium ${OUTCOME_STYLES[r.outcome]}`}>
                      {r.outcome}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
