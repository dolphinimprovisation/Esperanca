import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, Store, ExternalLink } from "lucide-react";
import { listarFornecedores, criarFornecedor, atualizarFornecedor, removerFornecedor } from "../lib/fornecedores";
import ModalFornecedor from "../components/ModalFornecedor";

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(null);

  async function recarregar() {
    try {
      setErro(null);
      const fs = await listarFornecedores();
      setFornecedores(fs);
    } catch (e) {
      setErro(e.message || String(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { recarregar(); }, []);

  const filtrado = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return fornecedores;
    return fornecedores.filter((f) =>
      f.nome.toLowerCase().includes(q) ||
      (f.obs || "").toLowerCase().includes(q) ||
      (f.site || "").toLowerCase().includes(q)
    );
  }, [fornecedores, busca]);

  async function salvar(form) {
    if (modal.modo === "novo") {
      await criarFornecedor(form);
    } else {
      await atualizarFornecedor(modal.fornecedor.id, form);
    }
    setModal(null);
    await recarregar();
  }

  async function excluir(f) {
    if (!confirm(`Remover fornecedor "${f.nome}"?\n\nIsto não apaga compras já registradas com este fornecedor.`)) return;
    try {
      await removerFornecedor(f.id);
      await recarregar();
    } catch (e) {
      alert("Erro ao remover: " + (e.message || e));
    }
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e3e0d8", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #eeebe3", flexWrap: "wrap", gap: 12 }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 320 }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#9b9b94" }} />
          <input className="mono" placeholder="Buscar fornecedor..." value={busca} onChange={(e) => setBusca(e.target.value)}
            style={{ width: "100%", padding: "8px 12px 8px 33px", border: "1px solid #ddd9cf", borderRadius: 6, fontSize: 13, background: "#fbfaf7" }} />
        </div>
        <button className="add-btn mono" onClick={() => setModal({ modo: "novo", fornecedor: null })}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", border: "1px solid #2b2b28", borderRadius: 6, background: "transparent", color: "#2b2b28", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={16} /> Adicionar fornecedor
        </button>
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
          <Store size={32} style={{ opacity: 0.3, marginBottom: 10 }} /><br />
          {fornecedores.length === 0 ? "Nenhum fornecedor cadastrado." : "Nenhum fornecedor encontrado."}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr className="mono" style={{ textAlign: "left", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: "#9b9b94" }}>
                <th style={{ padding: "12px 20px", fontWeight: 600 }}>Nome</th>
                <th style={{ padding: "12px 12px", fontWeight: 600 }}>Site</th>
                <th style={{ padding: "12px 12px", fontWeight: 600 }}>Link de busca</th>
                <th style={{ padding: "12px 12px", fontWeight: 600 }}>Observação</th>
                <th style={{ padding: "12px 20px" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtrado.map((f) => (
                <tr key={f.id} className="row" style={{ borderTop: "1px solid #f0ede5" }}>
                  <td style={{ padding: "13px 20px", fontWeight: 600 }}>{f.nome}</td>
                  <td className="mono" style={{ padding: "13px 12px", fontSize: 12.5, color: "#5b6470", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.site ? (
                      <a href={f.site} target="_blank" rel="noopener noreferrer" style={{ color: "#5b6470", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {f.site.replace(/^https?:\/\//, "")} <ExternalLink size={11} />
                      </a>
                    ) : <span style={{ color: "#c9c6bd" }}>—</span>}
                  </td>
                  <td className="mono" style={{ padding: "13px 12px", fontSize: 12, color: f.busca ? "#5b6470" : "#c9c6bd", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.busca || "—"}
                  </td>
                  <td className="mono" style={{ padding: "13px 12px", fontSize: 12.5, color: "#5b6470" }}>{f.obs || <span style={{ color: "#c9c6bd" }}>—</span>}</td>
                  <td style={{ padding: "13px 20px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="icon-btn" onClick={() => setModal({ modo: "editar", fornecedor: f })} style={{ color: "#5b6470", marginRight: 12 }}><Pencil size={16} /></button>
                    <button className="icon-btn" onClick={() => excluir(f)} style={{ color: "#cf6b6b" }}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ModalFornecedor
          modo={modal.modo}
          fornecedor={modal.fornecedor}
          onSalvar={salvar}
          onFechar={() => setModal(null)}
        />
      )}
    </div>
  );
}
