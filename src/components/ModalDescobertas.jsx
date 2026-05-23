import { useState } from "react";
import { X, ExternalLink, Sparkles, Plus, Check } from "lucide-react";

const fmtR = (v) => "R$ " + Number(v).toFixed(2).replace(".", ",");
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

export default function ModalDescobertas({ itensComDescobertas, fornecedoresExistentes, onAceitar, onFechar }) {
  // itensComDescobertas: [{ item, lojas: [{nome, site, url, preco}] }]
  // Estado de seleção por (itemIdx, lojaIdx)
  const [marcadas, setMarcadas] = useState(() => {
    const init = {};
    itensComDescobertas.forEach((row, i) => {
      row.lojas.forEach((_, j) => { init[`${i}-${j}`] = true; });
    });
    return init;
  });
  const [aplicando, setAplicando] = useState(false);

  function toggle(i, j) {
    const k = `${i}-${j}`;
    setMarcadas((m) => ({ ...m, [k]: !m[k] }));
  }

  function lojaJaExiste(loja) {
    const a = norm(loja.nome);
    return fornecedoresExistentes.find((f) => norm(f.nome) === a) || null;
  }

  async function aceitarSelecionadas() {
    const selecoes = [];
    itensComDescobertas.forEach((row, i) => {
      row.lojas.forEach((loja, j) => {
        if (marcadas[`${i}-${j}`]) {
          selecoes.push({ item: row.item, loja, existente: lojaJaExiste(loja) });
        }
      });
    });
    if (selecoes.length === 0) return;
    setAplicando(true);
    try { await onAceitar(selecoes); }
    catch (e) { alert("Erro: " + (e.message || e)); setAplicando(false); }
  }

  const totalLojas = itensComDescobertas.reduce((s, r) => s + r.lojas.length, 0);
  const totalMarcadas = Object.values(marcadas).filter(Boolean).length;

  return (
    <div onClick={onFechar} style={{ position: "fixed", inset: 0, background: "rgba(43,43,40,.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, width: "100%", maxWidth: 720, maxHeight: "85vh", boxShadow: "0 12px 40px rgba(0,0,0,.18)", overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: "'IBM Plex Sans', sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #eeebe3" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#b6936a", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Sparkles size={12} /> Modo descoberta
            </div>
            <h3 style={{ margin: "2px 0 0", fontSize: 19, fontWeight: 600, fontFamily: "'Newsreader', serif", color: "#2b2b28" }}>
              {totalLojas} sugestão(ões) em {itensComDescobertas.length} item(ns)
            </h3>
          </div>
          <button className="icon-btn" onClick={onFechar} style={{ color: "#9b9b94" }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "16px 22px" }}>
          {itensComDescobertas.length === 0 && (
            <div style={{ textAlign: "center", color: "#9b9b94", padding: "30px 0", fontSize: 14 }}>
              A IA não encontrou lojas para este item.
            </div>
          )}
          {itensComDescobertas.map((row, i) => (
            <div key={row.item.id} style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontFamily: "'Newsreader', serif", fontSize: 17, fontWeight: 600 }}>{row.item.nome}</div>
                {row.item.descricao ? <div style={{ fontSize: 12.5, color: "#9b9b94" }}>{row.item.descricao}</div> : null}
              </div>
              {row.lojas.length === 0 ? (
                <div style={{ fontSize: 13, color: "#9b9b94", paddingLeft: 4 }}>Nenhuma loja encontrada.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {row.lojas.map((loja, j) => {
                    const k = `${i}-${j}`;
                    const marcado = !!marcadas[k];
                    const existe = lojaJaExiste(loja);
                    return (
                      <div key={j} onClick={() => toggle(i, j)} style={{ cursor: "pointer", border: marcado ? "1px solid #b9d9c6" : "1px solid #eeebe3", background: marcado ? "#f2f8f4" : "#fbfaf7", borderRadius: 8, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 5, border: marcado ? "none" : "1.5px solid #c9c6bd", background: marcado ? "#2a9d63" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {marcado && <Check size={14} color="#fff" strokeWidth={3} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{loja.nome}</span>
                            {existe ? (
                              <span style={{ fontSize: 10.5, background: "#eef0f2", color: "#5b6470", padding: "1px 7px", borderRadius: 10, fontWeight: 600 }}>já cadastrado</span>
                            ) : (
                              <span style={{ fontSize: 10.5, background: "#fdf4e0", color: "#9a6b15", padding: "1px 7px", borderRadius: 10, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                                <Plus size={9} /> novo
                              </span>
                            )}
                          </div>
                          {loja.url && (
                            <a href={loja.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                              style={{ fontSize: 11.5, color: "#5b6470", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 2, maxWidth: 460, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {loja.url.replace(/^https?:\/\//, "").slice(0, 60)} <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#1a7544", flexShrink: 0 }}>
                          {loja.preco != null ? fmtR(loja.preco) : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "14px 22px", borderTop: "1px solid #eeebe3", background: "#fbfaf7" }}>
          <span style={{ fontSize: 12.5, color: "#5b6470" }}>{totalMarcadas} de {totalLojas} selecionada(s)</span>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onFechar} style={{ padding: "9px 18px", border: "1px solid #ddd9cf", borderRadius: 6, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#5b6470" }}>
              Cancelar
            </button>
            <button onClick={aceitarSelecionadas} disabled={totalMarcadas === 0 || aplicando}
              style={{ padding: "9px 18px", border: "none", borderRadius: 6, background: totalMarcadas === 0 || aplicando ? "#c9c6bd" : "#2b2b28", color: "#fff", fontSize: 13, fontWeight: 600, cursor: totalMarcadas === 0 || aplicando ? "default" : "pointer" }}>
              {aplicando ? "Aplicando..." : `Aceitar ${totalMarcadas}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
