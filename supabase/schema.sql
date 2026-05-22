-- ================================================================
-- Esperança — Schema + Seed inicial
-- ================================================================
-- Cola este ficheiro inteiro no SQL Editor do Supabase e clica Run.
-- Pode ser executado várias vezes — é idempotente.
-- ================================================================

-- ----------------------------------------------------------------
-- TABELAS
-- ----------------------------------------------------------------

create table if not exists public.itens (
  id          text primary key,
  categoria   text not null check (categoria in ('medicamentos', 'higiene', 'sondagem')),
  nome        text not null,
  descricao   text not null default '',
  estoque     int  not null default 0,
  minimo      int  not null default 0,
  consumo     int  not null default 0,
  posologia   text not null default '',
  observacoes text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists itens_categoria_idx on public.itens (categoria);

create table if not exists public.fornecedores (
  id         text primary key,
  nome       text not null,
  site       text not null default '',
  busca      text not null default '',
  obs        text not null default '',
  created_at timestamptz not null default now()
);

-- Cotação corrente por item (escolhidos + preços anotados + selo de comprado)
create table if not exists public.cotacoes (
  item_id    text primary key references public.itens(id) on delete cascade,
  escolhidos text[]      not null default '{}',
  precos     jsonb       not null default '{}'::jsonb,
  comprado   jsonb,
  updated_at timestamptz not null default now()
);

-- Histórico de compras registradas
create table if not exists public.compras (
  id         text primary key,
  ts         bigint not null,
  item_id    text   not null,
  item_nome  text   not null,
  categoria  text   not null,
  forn_id    text,
  forn_nome  text   not null default '—',
  valor      numeric(10,2) not null,
  qtd        int    not null,
  data       text   not null,
  created_at timestamptz not null default now()
);

create index if not exists compras_item_idx on public.compras (item_id);
create index if not exists compras_ts_idx   on public.compras (ts desc);

-- ----------------------------------------------------------------
-- Trigger para manter updated_at
-- ----------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists itens_touch on public.itens;
create trigger itens_touch before update on public.itens
  for each row execute function public.touch_updated_at();

drop trigger if exists cotacoes_touch on public.cotacoes;
create trigger cotacoes_touch before update on public.cotacoes
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------
-- RLS — por enquanto, permissivo (será apertado quando houver login)
-- ----------------------------------------------------------------
alter table public.itens        enable row level security;
alter table public.fornecedores enable row level security;
alter table public.cotacoes     enable row level security;
alter table public.compras      enable row level security;

drop policy if exists "anon all itens"        on public.itens;
drop policy if exists "anon all fornecedores" on public.fornecedores;
drop policy if exists "anon all cotacoes"     on public.cotacoes;
drop policy if exists "anon all compras"      on public.compras;

create policy "anon all itens"        on public.itens        for all using (true) with check (true);
create policy "anon all fornecedores" on public.fornecedores for all using (true) with check (true);
create policy "anon all cotacoes"     on public.cotacoes     for all using (true) with check (true);
create policy "anon all compras"      on public.compras      for all using (true) with check (true);

-- ----------------------------------------------------------------
-- SEED — Medicamentos
-- ----------------------------------------------------------------
insert into public.itens (id, categoria, nome, descricao, estoque, minimo, consumo, posologia) values
  ('m1',  'medicamentos', 'Dipirona 500mg/ml',   'dipirona sódica',       14,  2,  0, '40 gts 2x/dia + s/n'),
  ('m2',  'medicamentos', 'Glicazida 60mg MR',   'glicazida',             54, 10, 30, '1 cp 1x/dia'),
  ('m3',  'medicamentos', 'Glifage XR 750mg',    'metformina',            60, 10, 30, '1 cp 1x/dia'),
  ('m4',  'medicamentos', 'Hyabak 10ml',         'hialuronato de sódio',   3,  1,  0, '1 gt ambos olhos 3x/dia'),
  ('m5',  'medicamentos', 'Lactulose 667mg/ml',  'lactulose',             13,  2,  0, '20 ml 1x/dia'),
  ('m6',  'medicamentos', 'Macrodantina 100mg',  'nitrofurantoína',       28, 10, 30, '1 cp 1x/dia'),
  ('m7',  'medicamentos', 'Mirtazapina 15mg',    'mirtazapina',           69, 10, 30, '1 cp 1x/dia'),
  ('m8',  'medicamentos', 'Mupirocina 2%',       'mupirocina',             0,  1,  0, 'tópica 3x/dia s/n'),
  ('m9',  'medicamentos', 'Naturetti geleia',    'alcaçuz/cássia/senna',   2,  1,  0, '5 g 2x/dia'),
  ('m10', 'medicamentos', 'Propantelina 1% env', 'propantelina',           2,  1,  0, '1 apl 2x/dia'),
  ('m11', 'medicamentos', 'Quetiapina 25mg',     'quetiapina',            30, 10, 30, '1 cp 1x noite + s/n'),
  ('m12', 'medicamentos', 'Vitamina D3 7000UI',  'colecalciferol',         8,  2,  4, '1 cp 1x/semana')
on conflict (id) do nothing;

-- ----------------------------------------------------------------
-- SEED — Sondagem / Irrigação
-- ----------------------------------------------------------------
insert into public.itens (id, categoria, nome, descricao, estoque, minimo, consumo) values
  ('s1',  'sondagem', 'Álcool 70% 100ml',            '',                                                              0,  5, 20),
  ('s2',  'sondagem', 'Bolsa coletora',              'Urina B.Braun Sistema Fechado 2000ml',                          0,  5, 20),
  ('s3',  'sondagem', 'Campo estéril / fenestrado',  'Campo cirúrgico fenestrado estéril azul 50x50',                23,  5, 20),
  ('s4',  'sondagem', 'Clorexidina degermante',      '',                                                              0,  2,  5),
  ('s5',  'sondagem', 'Compressa gaze estéril',      '10cm x 15cm',                                                   0, 10, 30),
  ('s6',  'sondagem', 'Equipo macrogotas',           'Infusão macrogotas completo polybag 150cm',                     0,  5, 20),
  ('s7',  'sondagem', 'Kit irrigação',               'IRV Hart Duplo c/ Uro-Stop',                                    0,  3, 20),
  ('s8',  'sondagem', 'Kit sondagem',                'Vesical estéril descartável Kolplast',                          0,  3, 10),
  ('s9',  'sondagem', 'Seringa 20ml',                '',                                                              0,  5, 20),
  ('s10', 'sondagem', 'Sonda 3 vias nº20',           'Foley 3 vias nº20 (cx 10 un)',                                 15,  5,  5),
  ('s11', 'sondagem', 'Soro fisiológico',            'Cloreto de Sódio 0,9% 1000ml',                                  4,  5, 20),
  ('s12', 'sondagem', 'Urostop',                     '',                                                              0,  3,  5),
  ('s13', 'sondagem', 'Xylocaína estéril',           'caso não venha no kit',                                         0,  2,  5)
on conflict (id) do nothing;

-- ----------------------------------------------------------------
-- SEED — Fornecedores
-- ----------------------------------------------------------------
insert into public.fornecedores (id, nome, site, busca, obs) values
  ('fp1',  'Drogasil',             'https://www.drogasil.com.br',                  'https://www.drogasil.com.br/search?w={produto}',                              ''),
  ('fp2',  'Drogaria São Paulo',   'https://www.drogariasaopaulo.com.br',          'https://www.drogariasaopaulo.com.br/search?w={produto}',                      ''),
  ('fp3',  'Farmácias São João',   'https://www.saojoaofarmacias.com.br',          'https://www.saojoaofarmacias.com.br/busca?q={produto}',                       ''),
  ('fp4',  'Ultrafarma',           'https://www.ultrafarma.com.br',                'https://www.ultrafarma.com.br/busca?busca={produto}',                         ''),
  ('fp5',  'Pague Menos',          'https://www.paguemenos.com.br',                'https://www.paguemenos.com.br/search?w={produto}',                            ''),
  ('fp6',  'Panvel',               'https://www.panvel.com',                       'https://www.panvel.com/panvel/buscarProduto.do?termoPesquisa={produto}',      ''),
  ('fp7',  'Utilidades Clínicas',  'https://www.utilidadesclinicas.com.br',        'https://www.utilidadesclinicas.com.br/busca?q={produto}',                     'Material hospitalar'),
  ('fp8',  'Alimed',               'https://www.alimedprodutosparasaude.com.br',   'https://www.alimedprodutosparasaude.com.br/busca?q={produto}',                'Material hospitalar'),
  ('fp9',  'Magazine Médica',      'https://magazinemedica.com.br',                'https://magazinemedica.com.br/busca?q={produto}',                             'Material hospitalar'),
  ('fp10', 'AA Cirurgica',         '',                                             '',                                                                            'Pedido por contato'),
  ('fp11', 'Mercado Livre',        'https://www.mercadolivre.com.br',              'https://lista.mercadolivre.com.br/{produto}',                                 ''),
  ('fp12', 'Farma Delivery',       '',                                             '',                                                                            ''),
  ('fp13', 'Extrafarma',           'https://www.extrafarma.com.br',                'https://www.extrafarma.com.br/{produto}',                                     '')
on conflict (id) do nothing;
