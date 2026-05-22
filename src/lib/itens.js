import { supabase } from "./supabase";

// Lê todos os itens. Retorna { medicamentos: [...], higiene: [...], sondagem: [...] }.
export async function listarItens() {
  const { data, error } = await supabase
    .from("itens")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw error;
  const out = { medicamentos: [], higiene: [], sondagem: [] };
  for (const row of data) {
    if (out[row.categoria]) out[row.categoria].push(row);
  }
  return out;
}

// Cria um item novo. categoria + nome obrigatórios.
export async function criarItem(item) {
  const id = `${item.categoria[0]}${Date.now()}`;
  const payload = {
    id,
    categoria:   item.categoria,
    nome:        item.nome.trim(),
    descricao:   item.descricao ?? "",
    estoque:     Number(item.estoque) || 0,
    minimo:      Number(item.minimo)  || 0,
    consumo:     Number(item.consumo) || 0,
    posologia:   item.posologia ?? "",
    observacoes: item.observacoes ?? "",
  };
  const { data, error } = await supabase.from("itens").insert(payload).select().single();
  if (error) throw error;
  return data;
}

// Atualiza campos do item (passa só o que mudou).
export async function atualizarItem(id, campos) {
  const payload = { ...campos };
  ["estoque", "minimo", "consumo"].forEach((k) => {
    if (k in payload) payload[k] = Number(payload[k]) || 0;
  });
  const { data, error } = await supabase.from("itens").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function removerItem(id) {
  const { error } = await supabase.from("itens").delete().eq("id", id);
  if (error) throw error;
}
