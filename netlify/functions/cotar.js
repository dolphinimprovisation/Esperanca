// Netlify Function: cotar com Claude API + web_search
//
// POST  /.netlify/functions/cotar
// Headers: Authorization: Bearer <supabase access_token>
// Body:   { itens: [{id, nome, descricao}], fornecedores: [{id, nome, site, busca}], modelo: 'haiku'|'sonnet' }
// Resp:   { ok: true, resultados: { [itemId]: { [fornId]: { preco, url } } }, modelo, custos }
//
// Requer env vars no Netlify:
//   ANTHROPIC_API_KEY
//   VITE_SUPABASE_URL (já existe)
//   VITE_SUPABASE_KEY (já existe)

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const MODELS = {
  haiku:  "claude-haiku-4-5",
  sonnet: "claude-sonnet-4-5",
};

const SISTEMA = `Tu és um assistente que procura preços atuais de produtos em lojas online brasileiras.

Quando te pedirem para cotar um item em várias lojas, usa a ferramenta web_search para encontrar o produto em CADA loja indicada. Prioriza buscar dentro do site oficial da loja (usa "site:" no termo de busca quando útil).

Para cada loja, encontra a página exata do produto e devolve:
- "preco": preço atual em reais como número (ex: 12.50). Usa null se a loja não vender ou se não tiveres certeza.
- "url": URL direta da página do produto (NÃO a URL da página de pesquisa). null se preco for null.

REGRAS:
1. Devolve APENAS um bloco JSON, sem explicações, sem texto extra antes ou depois.
2. A chave de cada entrada é exatamente o ID do fornecedor que te dei.
3. Se um produto custar R$ 12,90, devolve 12.90 (ponto, não vírgula).
4. Se errares (chutares preço), o usuário paga errado. Prefere null se não tiveres certeza.

Formato exato:
\`\`\`json
{
  "fp1": {"preco": 12.50, "url": "https://..."},
  "fp2": {"preco": null, "url": null}
}
\`\`\``;

export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  // ---- AUTH: só utilizadores logados podem usar o bot ----
  const user = await verificarAuth(req);
  if (!user) return jsonError(401, "Login obrigatório para usar o bot.");

  // ---- PAYLOAD ----
  let payload;
  try { payload = await req.json(); }
  catch { return jsonError(400, "JSON inválido no body"); }

  const { itens = [], fornecedores = [], modelo = "haiku" } = payload;
  if (!Array.isArray(itens) || itens.length === 0) return jsonError(400, "itens vazio");
  if (!Array.isArray(fornecedores) || fornecedores.length === 0) return jsonError(400, "fornecedores vazio");
  const model = MODELS[modelo] || MODELS.haiku;

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonError(500, "ANTHROPIC_API_KEY não configurada no Netlify.");
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // ---- COTAÇÃO EM PARALELO ----
  const promessas = itens.map((item) => cotarItem(client, model, item, fornecedores)
    .then((res) => ({ ok: true, itemId: item.id, ...res }))
    .catch((err) => ({ ok: false, itemId: item.id, erro: err.message || String(err) }))
  );
  const resps = await Promise.all(promessas);

  const resultados = {};
  let totIn = 0, totOut = 0, totCacheRead = 0, totCacheWrite = 0;
  const erros = [];
  for (const r of resps) {
    if (r.ok) {
      resultados[r.itemId] = r.precos;
      totIn        += r.usage?.input_tokens          || 0;
      totOut       += r.usage?.output_tokens         || 0;
      totCacheRead += r.usage?.cache_read_input_tokens  || 0;
      totCacheWrite+= r.usage?.cache_creation_input_tokens || 0;
    } else {
      erros.push({ itemId: r.itemId, erro: r.erro });
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    modelo,
    resultados,
    erros,
    usage: { input_tokens: totIn, output_tokens: totOut, cache_read: totCacheRead, cache_write: totCacheWrite },
  }), { status: 200, headers: { "content-type": "application/json" } });
};

async function cotarItem(client, model, item, fornecedores) {
  const lista = fornecedores
    .map((f) => `- id "${f.id}": ${f.nome}${f.site ? " (" + f.site + ")" : ""}`)
    .join("\n");

  const userMsg = `Procura o preço atual deste produto:

PRODUTO: ${item.nome}${item.descricao ? "\nDESCRIÇÃO: " + item.descricao : ""}

LOJAS a verificar:
${lista}

Devolve o JSON com os IDs das lojas como chaves.`;

  const resp = await client.messages.create({
    model,
    max_tokens: 1024,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: Math.min(fornecedores.length + 1, 6) }],
    system: [{ type: "text", text: SISTEMA, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMsg }],
  });

  const text = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const precos = parseJsonBlock(text);
  return { precos, usage: resp.usage };
}

function parseJsonBlock(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fence ? fence[1] : text).trim();
  // tenta JSON direto; se falhar, tenta extrair o primeiro objeto {}
  try { return JSON.parse(raw); } catch {}
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) return JSON.parse(m[0]);
  throw new Error("Resposta da IA não trouxe JSON válido");
}

async function verificarAuth(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_KEY;
  if (!url || !key) return null;
  try {
    const sb = createClient(url, key);
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

function jsonError(status, mensagem) {
  return new Response(JSON.stringify({ ok: false, erro: mensagem }), {
    status, headers: { "content-type": "application/json" },
  });
}
