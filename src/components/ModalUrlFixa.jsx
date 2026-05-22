import { useState } from "react";
import { X, Link2 } from "lucide-react";

export default function ModalUrlFixa({ itemNome, fornNome, urlAtual, onSalvar, onFechar }) {
  const [url, setUrl] = useState(urlAtual || "");
  const [salvando, setSalvando] = useState(false);

  const campoStyle = { width: "100%", padding: "9px 11px", border: "1px solid #ddd9cf", borderRadius: 6, fontSize: 14, background: "#fbfaf7", fontFamily: "'IBM Plex Sans', sans-serif" };
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#5b6470", marginBottom: 5, fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: 0.3 };

  async function salvar(novaUrl) {
    setSalvando(true);
    try { await onSalvar(novaUrl.trim()); }
    catch (e) { alert("Erro: " + (e.message || e)); setSalvando(false); }
  }

  return (
    <div onClick={onFechar} style={{ position: "fixed", inset: 0, background: "rgba(43,43,40,.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, width: "100%", maxWidth: 480, boxShadow: "0 12px 40px rgba(0,0,0,.18)", overflow: "hidden", fontFamily: "'IBM Plex Sans', sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #eeebe3" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#b6936a", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Link2 size={12} /> URL fixa do produto
            </div>
            <h3 style={{ margin: "2px 0 0", fontSize: 17, fontWeight: 600, fontFamily: "'Newsreader', serif", color: "#2b2b28" }}>
              {itemNome} <span style={{ color: "#9b9b94", fontSize: 14 }}>em</span> {fornNome}
            </h3>
          </div>
          <button className="icon-btn" onClick={onFechar} style={{ color: "#9b9b94" }}><X size={20} /></button>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <p className="mono" style={{ fontSize: 13, color: "#5b6470", margin: 0, lineHeight: 1.5 }}>
            Cola aqui o link direto do produto na loja. Quando preenchido, o botão "abrir" usa esta URL em vez da busca genérica do fornecedor.
          </p>
          <div>
            <label style={labelStyle}>URL do produto</label>
            <input style={campoStyle} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." autoFocus />
            <div className="mono" style={{ fontSize: 11, color: "#9b9b94", marginTop: 4 }}>
              Deixa em branco para voltar a usar o link de busca genérico.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "16px 22px", borderTop: "1px solid #eeebe3", background: "#fbfaf7" }}>
          {urlAtual ? (
            <button onClick={() => salvar("")} disabled={salvando}
              style={{ padding: "9px 14px", border: "1px solid #ddd9cf", borderRadius: 6, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#cf6b6b" }}>
              Limpar
            </button>
          ) : <div />}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onFechar} style={{ padding: "9px 18px", border: "1px solid #ddd9cf", borderRadius: 6, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#5b6470" }}>
              Cancelar
            </button>
            <button onClick={() => salvar(url)} disabled={salvando} style={{ padding: "9px 18px", border: "none", borderRadius: 6, background: salvando ? "#c9c6bd" : "#2b2b28", color: "#fff", fontSize: 13, fontWeight: 600, cursor: salvando ? "default" : "pointer" }}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
