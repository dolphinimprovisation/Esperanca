import { useState } from "react";
import { X } from "lucide-react";
import { qtdSugerida } from "../lib/constantes";
import PctBadge from "./PctBadge";

const fmtR = (v) => "R$ " + Number(v).toFixed(2).replace(".", ",");

export default function ModalCompra({ item, fornecedores, cot, menorHist, onRegistrar, onFechar }) {
  const precos = cot.precos || {};
  const escolhidos = (cot.escolhidos || [])
    .map((id) => fornecedores.find((f) => f.id === id))
    .filter(Boolean);

  // pré-seleciona o fornecedor com menor preço cotado
  const comMenor = escolhidos
    .map((f) => ({ f, p: parseFloat(String(precos[f.id] || "").replace(",", ".")) || 0 }))
    .filter((x) => x.p > 0)
    .sort((a, b) => a.p - b.p)[0];

  const [fornId, setFornId] = useState(comMenor ? comMenor.f.id : (escolhidos[0]?.id || ""));
  const precoInicial = (() => {
    const p = precos[fornId];
    return p ? String(p) : (comMenor ? String(comMenor.p).replace(".", ",") : "");
  })();
  const [valor, setValor] = useState(precoInicial);
  const [qtd, setQtd] = useState(String(qtdSugerida(item)));
  const [salvando, setSalvando] = useState(false);

  function trocarForn(id) {
    setFornId(id);
    const p = precos[id];
    if (p) setValor(String(p));
  }

  const valorNum = parseFloat(String(valor).replace(",", ".")) || 0;
  const qtdNum   = parseInt(qtd) || 0;
  const podeSalvar = fornId && valorNum > 0 && qtdNum > 0 && !salvando;
  let pct = null;
  if (valorNum > 0 && qtdNum > 0 && menorHist != null && menorHist > 0) {
    pct = (valorNum / qtdNum - menorHist) / menorHist;
  }

  const campoStyle = { width: "100%", padding: "9px 11px", border: "1px solid #ddd9cf", borderRadius: 6, fontSize: 14, background: "#fbfaf7", fontFamily: "'IBM Plex Sans', sans-serif" };
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#5b6470", marginBottom: 5, fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: 0.3 };

  async function clickSalvar() {
    if (!podeSalvar) return;
    const forn = fornecedores.find((f) => f.id === fornId);
    setSalvando(true);
    try {
      await onRegistrar({
        fornId,
        fornNome: forn?.nome || "—",
        valor: valorNum,
        qtd: qtdNum,
      });
    } catch (e) {
      alert("Erro ao registrar: " + (e.message || e));
      setSalvando(false);
    }
  }

  return (
    <div onClick={onFechar} style={{ position: "fixed", inset: 0, background: "rgba(43,43,40,.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, width: "100%", maxWidth: 440, boxShadow: "0 12px 40px rgba(0,0,0,.18)", overflow: "hidden", fontFamily: "'IBM Plex Sans', sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #eeebe3" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#b6936a" }}>Registrar compra</div>
            <h3 style={{ margin: "2px 0 0", fontSize: 19, fontWeight: 600, fontFamily: "'Newsreader', serif", color: "#2b2b28" }}>{item.nome}</h3>
          </div>
          <button className="icon-btn" onClick={onFechar} style={{ color: "#9b9b94" }}><X size={20} /></button>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 15 }}>
          {escolhidos.length === 0 ? (
            <p className="mono" style={{ fontSize: 13, color: "#9b9b94", margin: 0 }}>
              Marque ao menos um fornecedor antes de registrar a compra.
            </p>
          ) : (
            <>
              <div>
                <label style={labelStyle}>Onde comprou *</label>
                <select style={campoStyle} value={fornId} onChange={(e) => trocarForn(e.target.value)}>
                  {escolhidos.map((f) => {
                    const p = precos[f.id];
                    return (
                      <option key={f.id} value={f.id}>
                        {f.nome}{p ? ` — cotado R$ ${p}` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Valor total (R$) *</label>
                  <input style={campoStyle} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" autoFocus />
                </div>
                <div>
                  <label style={labelStyle}>Quantidade *</label>
                  <input type="number" min="1" style={campoStyle} value={qtd} onChange={(e) => setQtd(e.target.value)} />
                </div>
              </div>
              {valorNum > 0 && qtdNum > 0 && (
                <div className="mono" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#5b6470" }}>
                  Preço unitário: <b>{fmtR(valorNum / qtdNum)}</b>
                  {pct != null && <PctBadge pct={pct} />}
                  {menorHist != null && (
                    <span style={{ color: "#9b9b94", fontSize: 12 }}>
                      (menor já pago: {fmtR(menorHist)})
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: "1px solid #eeebe3", background: "#fbfaf7" }}>
          <button onClick={onFechar} style={{ padding: "9px 18px", border: "1px solid #ddd9cf", borderRadius: 6, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#5b6470" }}>
            Cancelar
          </button>
          <button onClick={clickSalvar} disabled={!podeSalvar} style={{ padding: "9px 18px", border: "none", borderRadius: 6, background: podeSalvar ? "#2b2b28" : "#c9c6bd", color: "#fff", fontSize: 13, fontWeight: 600, cursor: podeSalvar ? "pointer" : "default" }}>
            {salvando ? "Salvando..." : "Registrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
