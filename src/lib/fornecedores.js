import { supabase } from "./supabase";

export async function listarFornecedores() {
  const { data, error } = await supabase
    .from("fornecedores")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw error;
  return data;
}

export async function criarFornecedor(f) {
  const id = "f" + Date.now();
  const payload = {
    id,
    nome:  f.nome.trim(),
    site:  f.site  ?? "",
    busca: f.busca ?? "",
    obs:   f.obs   ?? "",
  };
  const { data, error } = await supabase.from("fornecedores").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function atualizarFornecedor(id, campos) {
  const { data, error } = await supabase.from("fornecedores").update(campos).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function removerFornecedor(id) {
  const { error } = await supabase.from("fornecedores").delete().eq("id", id);
  if (error) throw error;
}

// Constrói URL para abrir o produto no site do fornecedor.
export function linkBusca(forn, termo) {
  const q = encodeURIComponent(termo);
  if (forn.busca && forn.busca.includes("{produto}")) return forn.busca.replace("{produto}", q);
  if (forn.busca) return forn.busca;
  if (forn.site)  return forn.site.replace(/\/$/, "");
  return null;
}
