// Chama a Netlify Function /cotar.
// Em dev (vite npm run dev) ela não existe — só funciona depois de deploy ou rodando netlify dev.
// Para teste local sem deploy, ver mensagem de erro abaixo.

export async function cotarComIA({ itens, fornecedores, modelo = "haiku" }) {
  const resp = await fetch("/.netlify/functions/cotar", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ itens, fornecedores, modelo }),
  });

  if (!resp.ok) {
    let detalhe = "";
    try { detalhe = (await resp.json()).erro || ""; } catch {}
    throw new Error(`Erro ${resp.status}${detalhe ? " — " + detalhe : ""}`);
  }
  return resp.json();
}
