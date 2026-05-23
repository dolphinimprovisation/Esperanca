// Netlify Function: cotar com Claude API + web_search
//
// POST  /.netlify/functions/cotar
// Headers: Authorization: Bearer <supabase access_token>
// Body:
//   { itens, fornecedores, modelo: 'haiku'|'sonnet', descoberta?: boolean }
//
// Modo padrão (descoberta=false): cota o item nas lojas indicadas. Devolve resultados[itemId][fornId].
// Modo descoberta (descoberta=true): procura o produto em qualquer farmácia online brasileira.
//   Devolve descobertas[itemId] = [{ nome, site, url, preco }, ...].
//
// Requer env vars no Netlify:
//   ANTHROPIC_API_KEY
//   VITE_SUPABASE_URL / VITE_SUPABASE_KEY

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const MODELS = {
  haiku:  "claude-haiku-4-5",
  sonnet: "claude-sonnet-4-5",
};

const SISTEMA_COTACAO = `Tu és um assistente que procura preços atuais de produtos em lojas online brasileiras.

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

const SISTEMA_DESCOBERTA = `Tu és um assistente que descobre onde comprar produtos no Brasil online.

Quando te pedirem para encontrar um produto, usa web_search para descobrir até 5 lojas online brasileiras (farmácias, distribuidoras, marketplaces sérios) que vendam exatamente esse produto, com o melhor preço possível.

Para cada loja encontrada devolve:
- "nome": nome curto e oficial da loja (ex: "Drogasil", "Mercado Livre")
- "site": URL da home da loja (ex: "https://www.drogasil.com.br")
- "url": URL direta da página do produto encontrado (não da pesquisa)
- "preco": preço atual em reais como número (ex: 12.50)

REGRAS:
1. Devolve APENAS um bloco JSON, sem texto extra antes ou depois.
2. Se nenhuma loja confiável tiver o produto, devolve {"lojas": []}.
3. Não inventes. Se não tiveres certeza do preço, omite essa loja.
4. Lojas brasileiras (.com.br ou marketplaces nacionais). Não recomendes lojas estrangeiras.
5. Limite: máximo 5 lojas.

Formato exato:
\`\`\`json
{
  "lojas": [
    {"nome": "Drogasil", "site": "https://www.drogasil.com.br", "url": "https://www.drogasil.com.br/produto/...", "preco": 12.50},
    {"nome": "Pague Menos", "site": "https://www.paguemenos.com.br", "url": "https://...", "preco": 14.90}
  ]
}
\`\`\``;

export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const auth = await verificarAuth(req);
  if (!auth.ok) return jsonError(401, `Login obrigatório. (${auth.motivo})`);

  let payload;
  try { payload = await req.json(); }
  catch { return jsonError(400, "JSON inválido no body"); }

  const { itens = [], fornecedores = [], modelo = "haiku", descoberta = false } = payload;
  if (!Array.isArray(itens) || itens.length === 0) return jsonError(400, "itens vazio");
  if (!descoberta && (!Array.isArray(fornecedores) || fornecedores.length === 0)) {
    return jsonError(400, "fornecedores vazio (necessário no modo cotação)");
  }
  const model = MODELS[modelo] || MODELS.haiku;

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonError(500, "ANTHROPIC_API_KEY não configurada no Netlify.");
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const promessas = itens.map((item) => {
    const tarefa = descoberta
      ? descobrirItem(client, model, item)
      : cotarItem(client, model, item, fornecedores);
    return tarefa
      .then((res) => ({ ok: true, itemId: item.id, ...res }))
      .catch((err) => ({ ok: false, itemId: item.id, erro: err.message || String(err) }));
  });
  const resps = await Promise.all(promessas);

  const resultados = {};
  const descobertas = {};
  let totIn = 0, totOut = 0, totCacheRead = 0, totCacheWrite = 0;
  const erros = [];
  for (const r of resps) {
    if (r.ok) {
      if (descoberta) descobertas[r.itemId] = r.lojas || [];
      else            resultados[r.itemId] = r.precos || {};
      totIn        += r.usage?.input_tokens                 || 0;
      totOut       += r.usage?.output_tokens                || 0;
      totCacheRead += r.usage?.cache_read_input_tokens      || 0;
      totCacheWrite+= r.usage?.cache_creation_input_tokens  || 0;
    } else {
      erros.push({ itemId: r.itemId, erro: r.erro });
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    modelo,
    descoberta,
    resultados,
    descobertas,
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
    system: [{ type: "text", text: SISTEMA_COTACAO, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMsg }],
  });

  const text = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const precos = parseJsonBlock(text);
  return { precos, usage: resp.usage };
}

async function descobrirItem(client, model, item) {
  const userMsg = `Encontra lojas online brasileiras que vendam:

PRODUTO: ${item.nome}${item.descricao ? "\nDESCRIÇÃO: " + item.descricao : ""}

Procura até 5 lojas com o produto e seus preços atuais. Devolve o JSON.`;

  const resp = await client.messages.create({
    model,
    max_tokens: 1500,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
    system: [{ type: "text", text: SISTEMA_DESCOBERTA, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMsg }],
  });

  const text = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const parsed = parseJsonBlock(text);
  const lojas = Array.isArray(parsed?.lojas) ? parsed.lojas : [];
  return { lojas, usage: resp.usage };
}

function parseJsonBlock(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fence ? fence[1] : text).trim();
  try { return JSON.parse(raw); } catch {}
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) return JSON.parse(m[0]);
  throw new Error("Resposta da IA não trouxe JSON válido");
}

async function verificarAuth(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, motivo: "sem token na request" };
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
  if (!url) return { ok: false, motivo: "VITE_SUPABASE_URL ausente nas vars de Functions do Netlify" };
  if (!key) return { ok: false, motivo: "VITE_SUPABASE_KEY ausente nas vars de Functions do Netlify" };
  try {
    const sb = createClient(url, key);
    const { data, error } = await sb.auth.getUser(token);
    if (error) return { ok: false, motivo: `getUser falhou: ${error.message}` };
    if (!data.user) return { ok: false, motivo: "token inválido ou expirado — sai e entra de novo" };
    return { ok: true, user: data.user };
  } catch (e) {
    return { ok: false, motivo: `excecao: ${e.message || e}` };
  }
}

function jsonError(status, mensagem) {
  return new Response(JSON.stringify({ ok: false, erro: mensagem }), {
    status, headers: { "content-type": "application/json" },
  });
}
