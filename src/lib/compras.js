import { supabase } from "./supabase";

// Lista TODAS as compras, ordenadas por ts desc.
export async function listarCompras() {
  const { data, error } = await supabase
    .from("compras")
    .select("*")
    .order("ts", { ascending: false });
  if (error) throw error;
  // Normaliza nomes para o que a UI espera (camelCase parcial).
  return data.map((r) => ({
    id:       r.id,
    ts:       Number(r.ts),
    itemId:   r.item_id,
    itemNome: r.item_nome,
    categoria:r.categoria,
    fornId:   r.forn_id,
    fornNome: r.forn_nome,
    valor:    Number(r.valor),
    qtd:      Number(r.qtd),
    data:     r.data,
  }));
}

export async function criarCompra(c) {
  const id = "h" + Date.now();
  const ts = Date.now();
  const payload = {
    id,
    ts,
    item_id:   c.itemId,
    item_nome: c.itemNome,
    categoria: c.categoria,
    forn_id:   c.fornId || null,
    forn_nome: c.fornNome || "—",
    valor:     Number(c.valor),
    qtd:       Number(c.qtd) || 0,
    data:      c.data || new Date().toLocaleDateString("pt-BR"),
  };
  const { error } = await supabase.from("compras").insert(payload);
  if (error) throw error;
  return { id, ts };
}

export async function removerCompra(id) {
  const { error } = await supabase.from("compras").delete().eq("id", id);
  if (error) throw error;
}
