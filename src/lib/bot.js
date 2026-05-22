import { supabase } from "./supabase";

// Chama a Netlify Function /cotar com o access_token do Supabase.
// Em dev (vite npm run dev) ela NÃO existe — só funciona depois de deploy ou rodando `netlify dev`.
export async function cotarComIA({ itens, fornecedores, modelo = "haiku" }) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Não estás logado");

  const resp = await fetch("/.netlify/functions/cotar", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ itens, fornecedores, modelo }),
  });

  if (!resp.ok) {
    let detalhe = "";
    try { detalhe = (await resp.json()).erro || ""; } catch {}
    throw new Error(`Erro ${resp.status}${detalhe ? " — " + detalhe : ""}`);
  }
  return resp.json();
}
