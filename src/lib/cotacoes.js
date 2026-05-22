import { supabase } from "./supabase";

// Lê todas as cotações. Retorna mapa { itemId: { escolhidos, precos, comprado, urls } }.
export async function listarCotacoes() {
  const { data, error } = await supabase.from("cotacoes").select("*");
  if (error) throw error;
  const out = {};
  for (const row of data) {
    out[row.item_id] = {
      escolhidos: row.escolhidos || [],
      precos:     row.precos     || {},
      comprado:   row.comprado   || null,
      urls:       row.urls       || {},
    };
  }
  return out;
}

// Cria/atualiza a cotação de um item (upsert por item_id).
export async function salvarCotacao(itemId, { escolhidos, precos, comprado, urls }) {
  const payload = {
    item_id:    itemId,
    escolhidos: escolhidos ?? [],
    precos:     precos     ?? {},
    comprado:   comprado   ?? null,
    urls:       urls       ?? {},
  };
  const { error } = await supabase.from("cotacoes").upsert(payload, { onConflict: "item_id" });
  if (error) throw error;
}
