// Netlify Function: cotar
// POST { itens: [{id, nome, descricao}], fornecedores: [{id, nome, busca, site}], modelo: 'haiku'|'sonnet' }
// Retorna { resultados: { [itemId]: { [fornId]: { preco: number, url: string } } } }
//
// STUB (fase 6B): devolve preços e URLs fake para validar o fluxo end-to-end.
// A integração real com a Claude API + web_search vem na fase 6C.

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return jsonError(400, "JSON inválido no body");
  }

  const { itens = [], fornecedores = [], modelo = "haiku" } = payload;

  if (!Array.isArray(itens) || !Array.isArray(fornecedores)) {
    return jsonError(400, "itens e fornecedores devem ser arrays");
  }

  // STUB: gera preço pseudo-aleatório por item × fornecedor e URL de busca do fornecedor.
  const resultados = {};
  for (const item of itens) {
    resultados[item.id] = {};
    for (const f of fornecedores) {
      const preco = Number((10 + Math.random() * 90).toFixed(2));
      const url = montarBusca(f, item.nome);
      resultados[item.id][f.id] = { preco, url };
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      modelo,
      stub: true,
      resultados,
      info: "STUB — preços aleatórios. Integração real vem na fase 6C.",
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
};

function montarBusca(forn, termo) {
  const q = encodeURIComponent(termo);
  if (forn.busca && forn.busca.includes("{produto}")) return forn.busca.replace("{produto}", q);
  if (forn.busca) return forn.busca;
  if (forn.site)  return forn.site.replace(/\/$/, "");
  return "";
}

function jsonError(status, mensagem) {
  return new Response(JSON.stringify({ ok: false, erro: mensagem }), {
    status,
    headers: { "content-type": "application/json" },
  });
}
