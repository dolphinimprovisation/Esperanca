import { supabase } from "./supabase";

export async function cotarComIA({ itens, fornecedores, modelo = "haiku", descoberta = false }) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Não estás logado");

  const resp = await fetch("/.netlify/functions/cotar", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ itens, fornecedores, modelo, descoberta }),
  });

  if (!resp.ok) {
    let detalhe = "";
    try { detalhe = (await resp.json()).erro || ""; } catch {}
    throw new Error(`Erro ${resp.status}${detalhe ? " — " + detalhe : ""}`);
  }
  return resp.json();
}
