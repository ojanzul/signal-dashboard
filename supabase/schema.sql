-- Jalankan di Supabase SQL Editor sebelum deploy.

create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  timeframe text not null,
  created_at timestamptz not null default now(),

  price_at_signal numeric not null,
  indicators jsonb not null,          -- snapshot RSI/MACD/ATR/dll saat sinyal dibuat
  candles_snapshot jsonb,             -- 30 candle terakhir yang dikirim ke LLM (untuk audit)

  llm_signal text not null check (llm_signal in ('BUY', 'SELL', 'HOLD')),
  llm_confidence numeric not null check (llm_confidence >= 0 and llm_confidence <= 100),
  llm_reasoning text not null,
  model_used text not null default 'claude-sonnet-5',

  -- diisi belakangan oleh /api/validate-signals, buat validasi track record
  validated_at timestamptz,
  price_after numeric,
  outcome text check (outcome in ('BENAR', 'SALAH', 'NETRAL', null))
);

create index if not exists idx_signals_symbol_created on signals (symbol, created_at desc);
create index if not exists idx_signals_pending_validation on signals (created_at) where validated_at is null;

-- Row Level Security: matikan akses publik langsung, semua akses lewat API
-- route server-side (pakai service role key), bukan dari browser.
alter table signals enable row level security;
