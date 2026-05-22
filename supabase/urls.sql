-- ================================================================
-- Esperança — URLs fixas por item × fornecedor (e modelo do bot)
-- ================================================================
-- Cola no SQL Editor do Supabase e clica Run. Idempotente.
-- ================================================================

-- URLs fixas: { fornId: "https://..." } na cotação de cada item.
-- Quando preenchido, o botão "abrir" usa esta URL em vez do template genérico.
alter table public.cotacoes
  add column if not exists urls jsonb not null default '{}'::jsonb;
