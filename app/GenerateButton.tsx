"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-signals", { method: "POST" });
      if (!res.ok) throw new Error(`Gagal generate sinyal (${res.status})`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="rounded-md bg-amber px-4 py-2 font-mono text-sm font-medium text-void
                   transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Menganalisa..." : "Generate sinyal"}
      </button>
      {error && <p className="max-w-xs text-right text-xs text-bear">{error}</p>}
    </div>
  );
}
