-- ================================================================
-- Esperança — Aperto de RLS (só utilizadores autenticados)
-- ================================================================
-- Rodar DEPOIS de criar as contas dos 2 utilizadores no painel
-- Authentication → Users → Add user.
-- ================================================================

-- Remove as políticas permissivas antigas
drop policy if exists "anon all itens"        on public.itens;
drop policy if exists "anon all fornecedores" on public.fornecedores;
drop policy if exists "anon all cotacoes"     on public.cotacoes;
drop policy if exists "anon all compras"      on public.compras;

-- Novas políticas: só `authenticated` pode ler/escrever
create policy "auth all itens"        on public.itens
  for all to authenticated using (true) with check (true);

create policy "auth all fornecedores" on public.fornecedores
  for all to authenticated using (true) with check (true);

create policy "auth all cotacoes"     on public.cotacoes
  for all to authenticated using (true) with check (true);

create policy "auth all compras"      on public.compras
  for all to authenticated using (true) with check (true);
