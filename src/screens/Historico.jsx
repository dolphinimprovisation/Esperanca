import { useEffect, useMemo, useState } from "react";
import { History, Search, Trash2 } from "lucide-react";
import { listarCompras, removerCompra } from "../lib/compras";

const fmtR = (v) => "R$ " + Number(v).toFixed(2).replace(".", ",");

export default function Historico() {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState("");

  async function recarregar() {
    try {
      setErro(null);
      const h = await listarCompras();
      setHistorico(h);
    } catch (e) {
      setErro(e.message || String(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { recarregar(); }, []);

  const filtrado = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return historico;
    return historico.filter((h) =>
      h.itemNome.toLowerCase().includes(q) ||
      h.fornNome.toLowerCase().includes(q) ||
      (h.categoria || "").toLowerCase().includes(q) ||
      h.data.includes(q)
    );
  }, [historico, busca]);

  const totais = useMemo(() => {
    const totalGasto = historico.reduce((s, h) => s + Number(h.valor || 0), 0);
    const totalUnits = historico.reduce((s, h) => s + Number(h.qtd || 0), 0);
    return { totalGasto, totalUnits, n: historico.length };
  }, [historico]);

  async function remover(h) {
    if (!confirm(`Remover registro de "${h.itemNome}" (${h.data}, ${fmtR(h.valor)})?`)) return;
    try {
      await removerCompra(h.id);
      setHistorico((prev) => prev.filter((x) => x.id !== h.id));
    } catch (e) {
      alert("Erro ao remover: " + (e.message || e));
    }
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e3e0d8", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #eeebe3", flexWrap: "wrap", gap: 12 }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 320 }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#9b9b94" }} />
          <input className="mono" placeholder="Buscar item, fornecedor ou data..." value={busca} onChange={(e) => setBusca(e.target.value)}
            style={{ width: "100%", padding: "8px 12px 8px 33px", border: "1px solid #ddd9cf", borderRadius: 6, fontSize: 13, background: "#fbfaf7" }} />
        </div>
        <div className="mono" style={{ fontSize: 12.5, color: "#5b6470", display: "flex", gap: 16 }}>
          <span><b>{totais.n}</b> registro{totais.n !== 1 ? "s" : ""}</span>
          <span><b>{totais.totalUnits}</b> un</span>
          <span>Total: <b>{fmtR(totais.totalGasto)}</b></span>
        </div>
      </div>

      {erro && (
        <div className="mono" style={{ padding: "16px 20px", background: "#fbe9e9", color: "#a32d2d", fontSize: 13, borderBottom: "1px solid #eeebe3" }}>
          Erro: {erro}
        </div>
      )}

      {carregando ? (
        <div className="mono" style={{ padding: "56px 20px", textAlign: "center", color: "#9b9b94", fontSize: 14 }}>Carregando...</div>
      ) : filtrado.length === 0 ? (
        <div className="mono" style={{ padding: "56px 20px", textAlign: "center", color: "#9b9b94", fontSize: 14 }}>
          <History size={32} style={{ opacity: 0.3, marginBottom: 10 }} /><br />
          {historico.length === 0 ? "Nenhuma compra registrada ainda." : "Nenhum registro encontrado."}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr className="mono" style={{ textAlign: "left", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: "#9b9b94" }}>
                <th style={{ padding: "12px 20px", fontWeight: 600 }}>Data</th>
                <th style={{ padding: "12px 12px", fontWeight: 600 }}>Item</th>
                <th style={{ padding: "12px 12px", fontWeight: 600 }}>Fornecedor</th>
                <th style={{ padding: "12px 12px", fontWeight: 600, textAlign: "center" }}>Qtd</th>
                <th style={{ padding: "12px 12px", fontWeight: 600, textAlign: "right" }}>Valor</th>
                <th style={{ padding: "12px 12px", fontWeight: 600, textAlign: "right" }}>Unitário</th>
                <th style={{ padding: "12px 20px" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtrado.map((h) => {
                const unit = h.qtd > 0 ? h.valor / h.qtd : 0;
                return (
                  <tr key={h.id} className="row" style={{ borderTop: "1px solid #f0ede5" }}>
                    <td className="mono" style={{ padding: "13px 20px", color: "#9b9b94", whiteSpace: "nowrap" }}>{h.data}</td>
                    <td style={{ padding: "13px 12px" }}>
                      <div style={{ fontWeight: 600 }}>{h.itemNome}</div>
                      {h.categoria ? <div className="mono" style={{ fontSize: 11.5, color: "#9b9b94", marginTop: 2 }}>{h.categoria}</div> : null}
                    </td>
                    <td className="mono" style={{ padding: "13px 12px", color: "#5b6470" }}>{h.fornNome}</td>
                    <td className="mono" style={{ padding: "13px 12px", textAlign: "center", color: "#5b6470" }}>{h.qtd}</td>
                    <td className="mono" style={{ padding: "13px 12px", textAlign: "right", fontWeight: 600 }}>{fmtR(h.valor)}</td>
                    <td className="mono" style={{ padding: "13px 12px", textAlign: "right", color: "#5b6470" }}>{fmtR(unit)}</td>
                    <td style={{ padding: "13px 20px", textAlign: "right" }}>
                      <button className="icon-btn" onClick={() => remover(h)} style={{ color: "#cf6b6b" }} title="Remover registro">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
