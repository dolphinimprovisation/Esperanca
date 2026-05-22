import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { CATEGORIAS, catInfo, calcularStatus, CORES_STATUS } from "../lib/constantes";
import { listarItens, criarItem, atualizarItem, removerItem } from "../lib/itens";
import ModalItem from "../components/ModalItem";

export default function Estoque() {
  const [dados, setDados] = useState({ medicamentos: [], higiene: [], sondagem: [] });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [aba, setAba] = useState("medicamentos");
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(null);

  const catAtual = catInfo(aba);
  const itens = dados[aba];

  async function recarregar() {
    try {
      setErro(null);
      const d = await listarItens();
      setDados(d);
    } catch (e) {
      setErro(e.message || String(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { recarregar(); }, []);

  const itensFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return itens;
    return itens.filter((i) =>
      i.nome.toLowerCase().includes(q) ||
      (i.descricao || "").toLowerCase().includes(q)
    );
  }, [itens, busca]);

  async function salvarItem(form) {
    if (modal.modo === "novo") {
      await criarItem({ ...form, categoria: aba });
    } else {
      await atualizarItem(modal.item.id, form);
    }
    setModal(null);
    await recarregar();
  }

  async function excluir(item) {
    if (!confirm(`Remover "${item.nome}"?`)) return;
    try {
      await removerItem(item.id);
      await recarregar();
    } catch (e) {
      alert("Erro ao remover: " + (e.message || e));
    }
  }

  return (
    <>
      <div style={{ display: "flex", gap: 4, marginBottom: 4, flexWrap: "wrap" }}>
        {CATEGORIAS.map((c) => {
          const ativo = c.id === aba;
          const nComprar = dados[c.id].filter((i) => calcularStatus(i).tipo === "critico").length;
          return (
            <button key={c.id} className="tab-btn mono"
              onClick={() => { setAba(c.id); setBusca(""); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 18px", border: "none", borderBottom: ativo ? "2px solid #2b2b28" : "2px solid transparent", background: ativo ? "#ece9e2" : "transparent", cursor: "pointer", fontSize: 14, fontWeight: ativo ? 600 : 500, color: ativo ? "#2b2b28" : "#5b6470", borderRadius: "6px 6px 0 0" }}>
              <c.Icone size={16} /> {c.nome}
              {nComprar > 0 && (
                <span style={{ background: "#cf4040", color: "#fff", fontSize: 11, fontWeight: 600, borderRadius: 10, padding: "1px 7px" }}>{nComprar}</span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e3e0d8", borderRadius: "0 8px 8px 8px", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #eeebe3", flexWrap: "wrap", gap: 12 }}>
          <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 320 }}>
            <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#9b9b94" }} />
            <input className="mono" placeholder="Buscar item..." value={busca} onChange={(e) => setBusca(e.target.value)}
              style={{ width: "100%", padding: "8px 12px 8px 33px", border: "1px solid #ddd9cf", borderRadius: 6, fontSize: 13, background: "#fbfaf7" }} />
          </div>
          <button className="add-btn mono" onClick={() => setModal({ modo: "novo", item: null })}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", border: "1px solid #2b2b28", borderRadius: 6, background: "transparent", color: "#2b2b28", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={16} /> Adicionar item
          </button>
        </div>

        {erro && (
          <div className="mono" style={{ padding: "16px 20px", background: "#fbe9e9", color: "#a32d2d", fontSize: 13, borderBottom: "1px solid #eeebe3" }}>
            Erro: {erro}
          </div>
        )}

        {carregando ? (
          <div className="mono" style={{ padding: "48px 20px", textAlign: "center", color: "#9b9b94", fontSize: 14 }}>Carregando...</div>
        ) : itensFiltrados.length === 0 ? (
          <div className="mono" style={{ padding: "48px 20px", textAlign: "center", color: "#9b9b94", fontSize: 14 }}>
            {itens.length === 0 ? `Nenhum item em ${catAtual.nome} ainda.` : "Nenhum item encontrado."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr className="mono" style={{ textAlign: "left", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: "#9b9b94" }}>
                  <th style={{ padding: "12px 20px", fontWeight: 600 }}>Item</th>
                  <th style={{ padding: "12px 12px", fontWeight: 600, textAlign: "center" }}>Estoque</th>
                  <th style={{ padding: "12px 12px", fontWeight: 600, textAlign: "center" }}>Mínimo</th>
                  <th style={{ padding: "12px 12px", fontWeight: 600, textAlign: "center" }}>Consumo/mês</th>
                  <th style={{ padding: "12px 12px", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "12px 20px" }}></th>
                </tr>
              </thead>
              <tbody>
                {itensFiltrados.map((item) => {
                  const s = calcularStatus(item);
                  const cor = CORES_STATUS[s.tipo];
                  return (
                    <tr key={item.id} className="row" style={{ borderTop: "1px solid #f0ede5" }}>
                      <td style={{ padding: "13px 20px" }}>
                        <div style={{ fontWeight: 600 }}>{item.nome}</div>
                        {item.descricao ? <div className="mono" style={{ fontSize: 12, color: "#9b9b94", marginTop: 2 }}>{item.descricao}</div> : null}
                        {catAtual.temPosologia && item.posologia ? <div className="mono" style={{ fontSize: 12, color: "#b6936a", marginTop: 2 }}>{item.posologia}</div> : null}
                      </td>
                      <td className="mono" style={{ padding: "13px 12px", textAlign: "center", fontWeight: 600, fontSize: 16 }}>{item.estoque}</td>
                      <td className="mono" style={{ padding: "13px 12px", textAlign: "center", color: "#9b9b94" }}>{item.minimo}</td>
                      <td className="mono" style={{ padding: "13px 12px", textAlign: "center", color: "#9b9b94" }}>{item.consumo || "—"}</td>
                      <td style={{ padding: "13px 12px" }}>
                        <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: cor.bg, color: cor.fg, fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: cor.dot }} /> {s.label}
                        </span>
                      </td>
                      <td style={{ padding: "13px 20px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <button className="icon-btn" onClick={() => setModal({ modo: "editar", item })} style={{ color: "#5b6470", marginRight: 12 }}><Pencil size={16} /></button>
                        <button className="icon-btn" onClick={() => excluir(item)} style={{ color: "#cf6b6b" }}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <ModalItem
          modo={modal.modo}
          item={modal.item}
          temPosologia={catAtual.temPosologia}
          categoria={catAtual.nome}
          onSalvar={salvarItem}
          onFechar={() => setModal(null)}
        />
      )}
    </>
  );
}
