import { useState } from "react";
import { X } from "lucide-react";

export default function ModalFornecedor({ modo, fornecedor, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nome:  fornecedor?.nome  || "",
    site:  fornecedor?.site  || "",
    busca: fornecedor?.busca || "",
    obs:   fornecedor?.obs   || "",
  });
  const [salvando, setSalvando] = useState(false);

  const up = (c, v) => setForm((f) => ({ ...f, [c]: v }));
  const podeSalvar = form.nome.trim().length > 0 && !salvando;

  const campoStyle = { width: "100%", padding: "9px 11px", border: "1px solid #ddd9cf", borderRadius: 6, fontSize: 14, background: "#fbfaf7", fontFamily: "'IBM Plex Sans', sans-serif" };
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#5b6470", marginBottom: 5, fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: 0.3 };

  async function clickSalvar() {
    if (!podeSalvar) return;
    setSalvando(true);
    try {
      await onSalvar(form);
    } catch (e) {
      alert("Erro ao salvar: " + (e.message || e));
      setSalvando(false);
    }
  }

  return (
    <div onClick={onFechar} style={{ position: "fixed", inset: 0, background: "rgba(43,43,40,.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, width: "100%", maxWidth: 520, boxShadow: "0 12px 40px rgba(0,0,0,.18)", overflow: "hidden", fontFamily: "'IBM Plex Sans', sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #eeebe3" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#b6936a" }}>Fornecedor</div>
            <h3 style={{ margin: "2px 0 0", fontSize: 19, fontWeight: 600, fontFamily: "'Newsreader', serif", color: "#2b2b28" }}>
              {modo === "novo" ? "Adicionar fornecedor" : "Editar fornecedor"}
            </h3>
          </div>
          <button className="icon-btn" onClick={onFechar} style={{ color: "#9b9b94" }}><X size={20} /></button>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 15 }}>
          <div>
            <label style={labelStyle}>Nome *</label>
            <input style={campoStyle} value={form.nome} onChange={(e) => up("nome", e.target.value)} placeholder="Ex: Drogasil" autoFocus />
          </div>
          <div>
            <label style={labelStyle}>Site (home da loja)</label>
            <input style={campoStyle} value={form.site} onChange={(e) => up("site", e.target.value)} placeholder="https://www.drogasil.com.br" />
          </div>
          <div>
            <label style={labelStyle}>
              Link de busca <span style={{ color: "#9b9b94", fontWeight: 400 }}>(use <code style={{ background: "#f0ede5", padding: "1px 5px", borderRadius: 4 }}>{"{produto}"}</code> onde entra o nome)</span>
            </label>
            <input style={campoStyle} value={form.busca} onChange={(e) => up("busca", e.target.value)} placeholder="https://www.drogasil.com.br/search?w={produto}" />
            <div className="mono" style={{ fontSize: 11, color: "#9b9b94", marginTop: 4 }}>
              Vá ao site da loja, busque qualquer produto, copie a URL e troque o termo pesquisado por <code>{"{produto}"}</code>.
            </div>
          </div>
          <div>
            <label style={labelStyle}>Observação</label>
            <input style={campoStyle} value={form.obs} onChange={(e) => up("obs", e.target.value)} placeholder="Ex: Material hospitalar, Pedido por contato..." />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: "1px solid #eeebe3", background: "#fbfaf7" }}>
          <button onClick={onFechar} style={{ padding: "9px 18px", border: "1px solid #ddd9cf", borderRadius: 6, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#5b6470" }}>
            Cancelar
          </button>
          <button onClick={clickSalvar} disabled={!podeSalvar} style={{ padding: "9px 18px", border: "none", borderRadius: 6, background: podeSalvar ? "#2b2b28" : "#c9c6bd", color: "#fff", fontSize: 13, fontWeight: 600, cursor: podeSalvar ? "pointer" : "default" }}>
            {salvando ? "Salvando..." : modo === "novo" ? "Adicionar" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
