import { useState } from "react";
import { X } from "lucide-react";

export default function ModalItem({ modo, item, temPosologia, categoria, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nome:        item?.nome        || "",
    descricao:   item?.descricao   || "",
    estoque:     item?.estoque     ?? 0,
    minimo:      item?.minimo      ?? 0,
    consumo:     item?.consumo     ?? 0,
    posologia:   item?.posologia   || "",
    observacoes: item?.observacoes || "",
  });
  const [salvando, setSalvando] = useState(false);

  const up = (c, v) => setForm((f) => ({ ...f, [c]: v }));
  const numerico = (v) => (v === "" ? 0 : Math.max(0, parseInt(v) || 0));
  const podeSalvar = form.nome.trim().length > 0 && !salvando;

  const campoStyle  = { width: "100%", padding: "9px 11px", border: "1px solid #ddd9cf", borderRadius: 6, fontSize: 14, background: "#fbfaf7", fontFamily: "'IBM Plex Sans', sans-serif" };
  const labelStyle  = { display: "block", fontSize: 12, fontWeight: 600, color: "#5b6470", marginBottom: 5, fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: 0.3 };

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
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, width: "100%", maxWidth: 460, boxShadow: "0 12px 40px rgba(0,0,0,.18)", overflow: "hidden", fontFamily: "'IBM Plex Sans', sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #eeebe3" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#b6936a" }}>{categoria}</div>
            <h3 style={{ margin: "2px 0 0", fontSize: 19, fontWeight: 600, fontFamily: "'Newsreader', serif", color: "#2b2b28" }}>
              {modo === "novo" ? "Adicionar item" : "Editar item"}
            </h3>
          </div>
          <button className="icon-btn" onClick={onFechar} style={{ color: "#9b9b94" }}><X size={20} /></button>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 15 }}>
          <div>
            <label style={labelStyle}>Nome do item *</label>
            <input style={campoStyle} value={form.nome} onChange={(e) => up("nome", e.target.value)} placeholder="Ex: Soro fisiológico" autoFocus />
          </div>
          <div>
            <label style={labelStyle}>Descrição</label>
            <input style={campoStyle} value={form.descricao} onChange={(e) => up("descricao", e.target.value)} placeholder="Especificação, marca, tamanho..." />
          </div>
          {temPosologia && (
            <div>
              <label style={labelStyle}>Posologia</label>
              <input style={campoStyle} value={form.posologia} onChange={(e) => up("posologia", e.target.value)} placeholder="Ex: 1 cp 1x/dia" />
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Estoque</label>
              <input type="number" min="0" style={campoStyle} value={form.estoque} onChange={(e) => up("estoque", numerico(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Mínimo</label>
              <input type="number" min="0" style={campoStyle} value={form.minimo} onChange={(e) => up("minimo", numerico(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Consumo/mês</label>
              <input type="number" min="0" style={campoStyle} value={form.consumo} onChange={(e) => up("consumo", numerico(e.target.value))} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Observações</label>
            <input style={campoStyle} value={form.observacoes} onChange={(e) => up("observacoes", e.target.value)} placeholder="Opcional" />
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
