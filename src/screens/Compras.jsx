import { useEffect, useMemo, useState } from "react";
import { ShoppingCart, ChevronDown, ChevronRight, Check, ExternalLink, Receipt, Link2, Sparkles } from "lucide-react";
import { CATEGORIAS, catInfo, calcularStatus, CORES_STATUS, qtdSugerida } from "../lib/constantes";
import { listarItens } from "../lib/itens";
import { listarFornecedores, linkBusca } from "../lib/fornecedores";
import { listarCotacoes, salvarCotacao } from "../lib/cotacoes";
import { listarCompras, criarCompra, removerCompra } from "../lib/compras";
import PctBadge from "../components/PctBadge";
import ModalCompra from "../components/ModalCompra";
import ModalUrlFixa from "../components/ModalUrlFixa";
import { cotarComIA } from "../lib/bot";

const EMPTY_COT = { escolhidos: [], precos: {}, comprado: null, urls: {} };
const fmtR = (v) => "R$ " + Number(v).toFixed(2).replace(".", ",");

// Estimativa grosseira de custo em USD por sessão.
// Inputs/outputs aproximados por item; web_search ~$0.01/uso, max ~5 usos por item.
function estimarCusto(nItens, nForns, modelo) {
  const tokensInPorItem  = 600 + nForns * 60;
  const tokensOutPorItem = 200 + nForns * 30;
  const precosM = modelo === "sonnet"
    ? { in: 3,    out: 15 }    // Sonnet $/M tokens
    : { in: 0.8,  out: 4 };    // Haiku
  const tokensUsd = nItens * (tokensInPorItem * precosM.in + tokensOutPorItem * precosM.out) / 1_000_000;
  const buscasUsd = nItens * Math.min(nForns, 5) * 0.01;
  return tokensUsd + buscasUsd;
}

export default function Compras() {
  const [dados, setDados]                 = useState({ medicamentos: [], higiene: [], sondagem: [] });
  const [fornecedores, setFornecedores]   = useState([]);
  const [cotacao, setCotacao]             = useState({});
  const [historico, setHistorico]         = useState([]);
  const [carregando, setCarregando]       = useState(true);
  const [erro, setErro]                   = useState(null);

  const [filtroCat, setFiltroCat]         = useState("todas");
  const [incluirAtencao, setIncluirAten]  = useState(false);
  const [ordenar, setOrdenar]             = useState("urgencia");
  const [expandido, setExpandido]         = useState({});
  const [modalCompra, setModalCompra]     = useState(null);
  const [modalUrl, setModalUrl]           = useState(null); // { item, forn, urlAtual }
  const [modeloIA, setModeloIA]           = useState("haiku");
  const [cotandoIA, setCotandoIA]         = useState(false);
  const [resultadoIA, setResultadoIA]     = useState(null);

  async function recarregar() {
    try {
      setErro(null);
      const [d, fs, cs, hs] = await Promise.all([
        listarItens(),
        listarFornecedores(),
        listarCotacoes(),
        listarCompras(),
      ]);
      setDados(d);
      setFornecedores(fs);
      setCotacao(cs);
      setHistorico(hs);
    } catch (e) {
      setErro(e.message || String(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { recarregar(); }, []);

  const lista = useMemo(() => {
    const out = [];
    CATEGORIAS.forEach((c) => {
      (dados[c.id] || []).forEach((item) => {
        const s = calcularStatus(item);
        if (s.tipo === "critico" || (incluirAtencao && s.tipo === "atencao")) {
          out.push({ ...item, catNome: c.curto, status: s });
        }
      });
    });
    let f = filtroCat === "todas" ? out : out.filter((i) => i.categoria === filtroCat);
    f.sort((a, b) => {
      if (ordenar === "urgencia")  return a.status.ordem - b.status.ordem || a.nome.localeCompare(b.nome);
      if (ordenar === "nome")      return a.nome.localeCompare(b.nome);
      return a.catNome.localeCompare(b.catNome) || a.nome.localeCompare(b.nome);
    });
    return f;
  }, [dados, filtroCat, incluirAtencao, ordenar]);

  const totalGeral = useMemo(() => {
    const c = {};
    CATEGORIAS.forEach((cat) => {
      c[cat.id] = (dados[cat.id] || []).filter((i) => {
        const t = calcularStatus(i).tipo;
        return t === "critico" || (incluirAtencao && t === "atencao");
      }).length;
    });
    c.todas = Object.values(c).reduce((a, b) => a + b, 0);
    return c;
  }, [dados, incluirAtencao]);

  const fornOrdenados = useMemo(
    () => [...fornecedores].sort((a, b) => a.nome.localeCompare(b.nome)),
    [fornecedores]
  );

  const cotDe = (itemId) => cotacao[itemId] || EMPTY_COT;
  const toggle = (id) => setExpandido((e) => ({ ...e, [id]: !e[id] }));

  function menorHistorico(itemId) {
    const compras = historico.filter((h) => h.itemId === itemId && h.qtd > 0);
    if (!compras.length) return null;
    return Math.min(...compras.map((h) => h.valor / h.qtd));
  }
  function historicoDoItem(itemId) {
    return historico.filter((h) => h.itemId === itemId);
  }

  async function persistir(itemId, novo) {
    try {
      await salvarCotacao(itemId, novo);
    } catch (e) {
      alert("Erro ao salvar cotação: " + (e.message || e));
    }
  }

  function toggleForn(itemId, fornId) {
    const atual = cotDe(itemId);
    const tem = atual.escolhidos.includes(fornId);
    const escolhidos = tem ? atual.escolhidos.filter((id) => id !== fornId) : [...atual.escolhidos, fornId];
    const novo = { ...atual, escolhidos };
    setCotacao((prev) => ({ ...prev, [itemId]: novo }));
    persistir(itemId, novo);
  }

  function setPrecoLocal(itemId, fornId, valor) {
    const atual = cotDe(itemId);
    const novo = { ...atual, precos: { ...atual.precos, [fornId]: valor } };
    setCotacao((prev) => ({ ...prev, [itemId]: novo }));
  }

  function setPrecoPersist(itemId) {
    persistir(itemId, cotDe(itemId));
  }

  // Resolve a URL para abrir: prioriza urls[fornId] (fixa) e cai no template do fornecedor.
  function urlParaAbrir(item, forn) {
    const c = cotDe(item.id);
    if (c.urls && c.urls[forn.id]) return c.urls[forn.id];
    return linkBusca(forn, item.nome);
  }

  async function salvarUrlFixa(itemId, fornId, url) {
    const atual = cotDe(itemId);
    const urls = { ...(atual.urls || {}) };
    if (url) urls[fornId] = url;
    else delete urls[fornId];
    const novo = { ...atual, urls };
    setCotacao((prev) => ({ ...prev, [itemId]: novo }));
    await persistir(itemId, novo);
    setModalUrl(null);
  }

  function cotarTodos(item) {
    const c = cotDe(item.id);
    const marcados = fornOrdenados.filter((f) => c.escolhidos.includes(f.id) && (f.busca || f.site || (c.urls && c.urls[f.id])));
    if (marcados.length === 0) return;
    let bloqueados = 0;
    marcados.forEach((f) => {
      const url = urlParaAbrir(item, f);
      if (!url) return;
      const win = window.open(url, "_blank", "noopener");
      if (!win) bloqueados++;
    });
    if (bloqueados > 0) {
      alert(
        `O browser bloqueou ${bloqueados} de ${marcados.length} abas (proteção contra pop-ups).\n\n` +
        `Para resolver: clica no ícone "Pop-ups bloqueados" na barra de endereço e escolhe ` +
        `"Permitir sempre pop-ups deste site". Depois clica em Cotar de novo.`
      );
    }
  }

  async function registrarCompra(item, payload) {
    const reg = {
      itemId: item.id,
      itemNome: item.nome,
      categoria: item.catNome,
      ...payload,
    };
    try {
      const { id, ts } = await criarCompra(reg);
      const linha = { ...reg, id, ts, data: new Date().toLocaleDateString("pt-BR") };
      setHistorico((prev) => [linha, ...prev]);
      const atual = cotDe(item.id);
      const novo = {
        ...atual,
        comprado: { fornId: payload.fornId, valor: payload.valor, qtd: payload.qtd, data: linha.data },
      };
      setCotacao((prev) => ({ ...prev, [item.id]: novo }));
      await persistir(item.id, novo);
      setModalCompra(null);
    } catch (e) {
      alert("Erro ao registrar compra: " + (e.message || e));
    }
  }

  async function acionarBotIA() {
    // monta payload: para cada item da lista visível, com ao menos 1 fornecedor marcado
    const tarefas = lista
      .map((item) => {
        const c = cotDe(item.id);
        const fornsDoItem = fornOrdenados.filter((f) => c.escolhidos.includes(f.id));
        return { item, fornsDoItem };
      })
      .filter((t) => t.fornsDoItem.length > 0);

    if (tarefas.length === 0) {
      alert("Marca primeiro pelo menos 1 fornecedor em cada item que queres cotar.");
      return;
    }

    // união de todos os fornecedores envolvidos
    const fornsSet = {};
    tarefas.forEach((t) => t.fornsDoItem.forEach((f) => { fornsSet[f.id] = f; }));
    const fornsUnicos = Object.values(fornsSet);

    const custoEst = estimarCusto(tarefas.length, fornsUnicos.length, modeloIA);
    if (!confirm(
      `Cotar ${tarefas.length} item(ns) em ${fornsUnicos.length} fornecedor(es) com ${modeloIA === "haiku" ? "Claude Haiku" : "Claude Sonnet"}?\n\n` +
      `Custo estimado: ~US$ ${custoEst.toFixed(3)} (~R$ ${(custoEst * 5).toFixed(2)}).\n\n` +
      `Pode demorar 10-30 segundos. A IA vai pesquisar em cada loja e preencher preços + URLs.`
    )) return;

    setCotandoIA(true);
    setResultadoIA(null);
    try {
      const payload = {
        modelo: modeloIA,
        itens: tarefas.map(({ item }) => ({
          id: item.id, nome: item.nome, descricao: item.descricao || "",
        })),
        fornecedores: fornsUnicos.map((f) => ({
          id: f.id, nome: f.nome, busca: f.busca || "", site: f.site || "",
        })),
      };

      const resp = await cotarComIA(payload);
      const resultados = resp.resultados || {};

      // aplica em cada item: preços e urls dos fornecedores do item
      const novosCot = { ...cotacao };
      for (const { item, fornsDoItem } of tarefas) {
        const atual = novosCot[item.id] || EMPTY_COT;
        const novosPrecos = { ...(atual.precos || {}) };
        const novasUrls   = { ...(atual.urls   || {}) };
        const porForn = resultados[item.id] || {};
        for (const f of fornsDoItem) {
          const r = porForn[f.id];
          if (!r) continue;
          if (r.preco != null) novosPrecos[f.id] = String(r.preco).replace(".", ",");
          if (r.url) novasUrls[f.id] = r.url;
        }
        const novo = { ...atual, precos: novosPrecos, urls: novasUrls };
        novosCot[item.id] = novo;
        // persiste cada um (paralelo)
        persistir(item.id, novo);
      }
      setCotacao(novosCot);
      setResultadoIA({
        ok: true,
        nItens: tarefas.length,
        nForns: fornsUnicos.length,
        stub: resp.stub,
        modelo: resp.modelo,
        erros: resp.erros || [],
        usage: resp.usage,
      });
    } catch (e) {
      setResultadoIA({ ok: false, erro: e.message || String(e) });
    } finally {
      setCotandoIA(false);
    }
  }

  async function desfazerCompra(item) {
    if (!confirm(`Desfazer a compra registrada de "${item.nome}"?`)) return;
    // remove o registro mais recente desse item
    const ultima = historico.find((h) => h.itemId === item.id);
    try {
      if (ultima) await removerCompra(ultima.id);
      setHistorico((prev) => prev.filter((h) => h.id !== ultima?.id));
      const atual = cotDe(item.id);
      const novo = { ...atual, comprado: null };
      setCotacao((prev) => ({ ...prev, [item.id]: novo }));
      await persistir(item.id, novo);
    } catch (e) {
      alert("Erro ao desfazer: " + (e.message || e));
    }
  }

  const chip = (a) => ({ padding: "6px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: 600, border: a ? "1px solid #2b2b28" : "1px solid #ddd9cf", background: a ? "#2b2b28" : "#fff", color: a ? "#f6f5f1" : "#5b6470", cursor: "pointer" });

  return (
    <div style={{ background: "#fff", border: "1px solid #e3e0d8", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
      {/* Filtros */}
      <div style={{ padding: "18px 20px", borderBottom: "1px solid #eeebe3", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#9b9b94", marginRight: 4 }}>Categoria</span>
          <button className="mono" style={chip(filtroCat === "todas")} onClick={() => setFiltroCat("todas")}>Todas ({totalGeral.todas})</button>
          {CATEGORIAS.map((c) => (
            <button key={c.id} className="mono" style={chip(filtroCat === c.id)} onClick={() => setFiltroCat(c.id)}>
              {c.curto} ({totalGeral[c.id]})
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#9b9b94", marginRight: 4 }}>Ordenar</span>
          <button className="mono" style={chip(ordenar === "urgencia")}  onClick={() => setOrdenar("urgencia")}>Urgência</button>
          <button className="mono" style={chip(ordenar === "nome")}      onClick={() => setOrdenar("nome")}>Nome</button>
          <button className="mono" style={chip(ordenar === "categoria")} onClick={() => setOrdenar("categoria")}>Categoria</button>
          <div style={{ flex: 1 }} />
          <button className="mono" style={chip(incluirAtencao)} onClick={() => setIncluirAten((v) => !v)}>
            {incluirAtencao ? "✓ " : ""}Incluir "Atenção"
          </button>
        </div>

        {/* Bot IA */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", paddingTop: 4, borderTop: "1px dashed #eeebe3", marginTop: 4 }}>
          <span className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#9b9b94", marginRight: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Sparkles size={11} /> Cotar com IA
          </span>
          <button className="mono" style={chip(modeloIA === "haiku")}  onClick={() => setModeloIA("haiku")}  title="Mais barato (~R$ 0,75 por sessão)">Haiku</button>
          <button className="mono" style={chip(modeloIA === "sonnet")} onClick={() => setModeloIA("sonnet")} title="Mais 'esperto' (~R$ 2,25 por sessão)">Sonnet</button>
          <button onClick={acionarBotIA} disabled={cotandoIA}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "none", borderRadius: 6, background: cotandoIA ? "#c9c6bd" : "#2b2b28", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: cotandoIA ? "default" : "pointer", fontFamily: "'IBM Plex Sans', sans-serif" }}>
            <Sparkles size={13} /> {cotandoIA ? "Buscando preços..." : "Iniciar cotação"}
          </button>
          {resultadoIA && (
            <span className="mono" style={{ fontSize: 12, color: resultadoIA.ok ? (resultadoIA.erros?.length ? "#9a6b15" : "#1a7544") : "#a32d2d", marginLeft: 6 }}>
              {resultadoIA.ok
                ? `✓ ${resultadoIA.nItens} item(ns) × ${resultadoIA.nForns} fornecedor(es)${resultadoIA.stub ? " (stub fake)" : ""}${resultadoIA.erros?.length ? ` · ${resultadoIA.erros.length} falha(s)` : ""}`
                : `Erro: ${resultadoIA.erro}`}
            </span>
          )}
        </div>
      </div>

      {erro && (
        <div className="mono" style={{ padding: "16px 20px", background: "#fbe9e9", color: "#a32d2d", fontSize: 13, borderBottom: "1px solid #eeebe3" }}>
          Erro: {erro}
        </div>
      )}

      {carregando ? (
        <div className="mono" style={{ padding: "56px 20px", textAlign: "center", color: "#9b9b94", fontSize: 14 }}>Carregando...</div>
      ) : lista.length === 0 ? (
        <div className="mono" style={{ padding: "56px 20px", textAlign: "center", color: "#9b9b94", fontSize: 14 }}>
          <ShoppingCart size={32} style={{ opacity: 0.3, marginBottom: 10 }} /><br />
          Nada a comprar {filtroCat !== "todas" ? `em ${catInfo(filtroCat).nome}` : "no momento"}. 🎉
        </div>
      ) : (
        <div>
          {lista.map((item) => {
            const cor = CORES_STATUS[item.status.tipo];
            const c = cotDe(item.id);
            const aberto = !!expandido[item.id];
            const nEscolhidos = c.escolhidos.length;
            const comprado = c.comprado;
            const fornComprado = comprado ? fornecedores.find((f) => f.id === comprado.fornId) : null;
            const menorHist = menorHistorico(item.id);
            const histItem = historicoDoItem(item.id);
            return (
              <div key={item.categoria + item.id} style={{ borderTop: "1px solid #f0ede5", background: comprado ? "#f7faf8" : "transparent" }}>
                {/* Linha do item */}
                <div className="row" onClick={() => toggle(item.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 20px", cursor: "pointer" }}>
                  {aberto
                    ? <ChevronDown size={18} color="#9b9b94" style={{ flexShrink: 0 }} />
                    : <ChevronRight size={18} color="#9b9b94" style={{ flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{item.nome}</div>
                    <div className="mono" style={{ fontSize: 12, color: "#9b9b94", marginTop: 2 }}>
                      <span style={{ background: "#f0ede5", padding: "1px 8px", borderRadius: 10, marginRight: 8 }}>{item.catNome}</span>
                      em estoque: <b style={{ color: item.estoque === 0 ? "#cf4040" : "#5b6470" }}>{item.estoque}</b>
                      {" · "}comprar: <b style={{ color: "#1a7544" }}>{qtdSugerida(item)}</b>
                      {nEscolhidos > 0 ? ` · ${nEscolhidos} fornecedor${nEscolhidos > 1 ? "es" : ""}` : ""}
                    </div>
                  </div>
                  {comprado && (
                    <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "#1a7544", background: "#d6efe0", padding: "4px 10px", borderRadius: 20, flexShrink: 0 }}>
                      <Check size={13} strokeWidth={3} /> COMPRADO
                    </span>
                  )}
                  <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: cor.bg, color: cor.fg, fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 20, flexShrink: 0 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: cor.dot }} /> {item.status.label}
                  </span>
                </div>

                {/* Expandido */}
                {aberto && (
                  <div style={{ padding: "0 20px 18px 50px" }}>
                    {/* Faixa de compra registrada */}
                    {comprado && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "#eaf5ee", border: "1px solid #cbe6d6", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                        <Check size={16} color="#1a7544" strokeWidth={3} />
                        <span className="mono" style={{ fontSize: 13, color: "#1a7544" }}>
                          Comprado em <b>{fornComprado ? fornComprado.nome : "—"}</b> por <b>{fmtR(comprado.valor)}</b> ({comprado.qtd} un) · {comprado.data}
                        </span>
                        <span className="mono" style={{ fontSize: 12, color: "#5b6470" }}>
                          Atualize o estoque na aba Estoque quando a entrega chegar.
                        </span>
                        <div style={{ flex: 1 }} />
                        <button onClick={(e) => { e.stopPropagation(); desfazerCompra(item); }} className="mono"
                          style={{ padding: "5px 11px", border: "1px solid #c9c6bd", borderRadius: 6, background: "#fff", color: "#5b6470", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          Desfazer
                        </button>
                      </div>
                    )}

                    {/* Menor preço já pago */}
                    {menorHist != null && (
                      <div className="mono" style={{ fontSize: 12.5, color: "#5b6470", marginBottom: 10 }}>
                        Menor preço já pago (unitário): <b style={{ color: "#1a7544" }}>{fmtR(menorHist)}</b>
                      </div>
                    )}

                    <div className="mono" style={{ fontSize: 12, color: "#9b9b94", marginBottom: 10 }}>
                      Marque os fornecedores que vendem este item. Anote o preço que achar em cada um.
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
                      {fornOrdenados.map((f) => {
                        const marcado = c.escolhidos.includes(f.id);
                        const preco = c.precos[f.id] || "";
                        const precoNum = parseFloat(String(preco).replace(",", ".")) || 0;
                        let pct = null;
                        if (precoNum > 0 && menorHist != null && menorHist > 0) {
                          pct = (precoNum - menorHist) / menorHist;
                        }
                        return (
                          <div key={f.id} style={{ border: marcado ? "1px solid #b9d9c6" : "1px solid #eeebe3", background: marcado ? "#f2f8f4" : "#fbfaf7", borderRadius: 8, padding: "9px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                              <div onClick={(e) => { e.stopPropagation(); toggleForn(item.id, f.id); }}
                                style={{ width: 20, height: 20, borderRadius: 5, border: marcado ? "none" : "1.5px solid #c9c6bd", background: marcado ? "#2a9d63" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                                {marcado && <Check size={14} color="#fff" strokeWidth={3} />}
                              </div>
                              <div onClick={(e) => { e.stopPropagation(); toggleForn(item.id, f.id); }}
                                style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                                <div className="mono" style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.nome}</div>
                                {f.obs ? <div className="mono" style={{ fontSize: 11, color: "#9b9b94" }}>{f.obs}</div> : null}
                              </div>
                              {marcado && (() => {
                                const urlFixa = c.urls && c.urls[f.id];
                                const podeAbrir = !!(urlFixa || f.busca || f.site);
                                return (
                                  <>
                                    <button onClick={(e) => { e.stopPropagation(); setModalUrl({ item, forn: f, urlAtual: urlFixa || "" }); }}
                                      className="icon-btn" title={urlFixa ? "URL fixa salva — clica para editar" : "Salvar URL fixa do produto"}
                                      style={{ color: urlFixa ? "#1a7544" : "#9b9b94", flexShrink: 0, padding: 2 }}>
                                      <Link2 size={14} />
                                    </button>
                                    {podeAbrir && (
                                      <button onClick={(e) => { e.stopPropagation(); const url = urlParaAbrir(item, f); if (url) window.open(url, "_blank", "noopener"); }}
                                        className="mono" title={urlFixa ? `Abrir URL fixa em ${f.nome}` : `Abrir busca por "${item.nome}" em ${f.nome}`}
                                        style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 9px", border: "1px solid #c5d8cc", borderRadius: 6, background: "#fff", color: "#1a7544", fontSize: 11.5, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                                        abrir <ExternalLink size={11} />
                                      </button>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                            {marcado && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                                <span className="mono" style={{ fontSize: 11.5, color: "#9b9b94" }}>R$</span>
                                <input
                                  value={preco}
                                  onChange={(e) => setPrecoLocal(item.id, f.id, e.target.value)}
                                  onBlur={() => setPrecoPersist(item.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  placeholder="preço"
                                  inputMode="decimal"
                                  className="mono"
                                  style={{ width: 80, padding: "5px 8px", border: "1px solid #ddd9cf", borderRadius: 5, fontSize: 12.5, background: "#fff" }}
                                />
                                {pct != null && <PctBadge pct={pct} />}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Ações */}
                    {(() => {
                      const marcadosComSite = fornOrdenados.filter((f) => c.escolhidos.includes(f.id) && (f.busca || f.site)).length;
                      return (
                        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <button onClick={(e) => { e.stopPropagation(); cotarTodos(item); }} disabled={marcadosComSite === 0}
                            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", border: "1px solid", borderRadius: 6, background: "transparent", color: marcadosComSite > 0 ? "#2b2b28" : "#c9c6bd", borderColor: marcadosComSite > 0 ? "#2b2b28" : "#dedbd2", fontSize: 13, fontWeight: 600, cursor: marcadosComSite > 0 ? "pointer" : "default", fontFamily: "'IBM Plex Sans', sans-serif" }}>
                            <ExternalLink size={15} /> Cotar {marcadosComSite > 0 ? `(${marcadosComSite})` : ""}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setModalCompra(item); }} disabled={nEscolhidos === 0}
                            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", border: "none", borderRadius: 6, background: nEscolhidos > 0 ? "#2b2b28" : "#c9c6bd", color: "#fff", fontSize: 13, fontWeight: 600, cursor: nEscolhidos > 0 ? "pointer" : "default", fontFamily: "'IBM Plex Sans', sans-serif" }}>
                            <Receipt size={15} /> {comprado ? "Editar compra" : "Registrar compra"}
                          </button>
                        </div>
                      );
                    })()}

                    {/* Mini-histórico */}
                    {histItem.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <div className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#9b9b94", marginBottom: 6 }}>
                          Histórico de preços deste item
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {histItem.map((h) => (
                            <div key={h.id} className="mono" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "#5b6470", padding: "4px 0" }}>
                              <span style={{ color: "#9b9b94", minWidth: 80 }}>{h.data}</span>
                              <span style={{ flex: 1 }}>{h.fornNome}</span>
                              <span style={{ color: "#9b9b94" }}>{h.qtd} un</span>
                              <b style={{ minWidth: 80, textAlign: "right", color: menorHist != null && (h.valor / h.qtd) <= menorHist + 0.0001 ? "#1a7544" : "#2b2b28" }}>
                                {fmtR(h.valor)}
                              </b>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalUrl && (
        <ModalUrlFixa
          itemNome={modalUrl.item.nome}
          fornNome={modalUrl.forn.nome}
          urlAtual={modalUrl.urlAtual}
          onSalvar={(novaUrl) => salvarUrlFixa(modalUrl.item.id, modalUrl.forn.id, novaUrl)}
          onFechar={() => setModalUrl(null)}
        />
      )}

      {modalCompra && (
        <ModalCompra
          item={modalCompra}
          fornecedores={fornecedores}
          cot={cotDe(modalCompra.id)}
          menorHist={menorHistorico(modalCompra.id)}
          onRegistrar={(payload) => registrarCompra(modalCompra, payload)}
          onFechar={() => setModalCompra(null)}
        />
      )}

      <div className="mono" style={{ padding: "14px 20px", borderTop: "1px solid #eeebe3", fontSize: 12.5, color: "#5b6470", background: "#fbfaf7", borderRadius: "0 0 10px 10px", lineHeight: 1.6 }}>
        Fluxo: marque os fornecedores → <b>Cotar</b> abre os sites → anote o preço de cada um (a % mostra se está caro/barato vs. o melhor já pago) → <b>Registrar compra</b> grava no histórico e marca como comprado.
      </div>
    </div>
  );
}
