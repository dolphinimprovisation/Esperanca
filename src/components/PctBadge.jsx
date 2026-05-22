import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { CORES_STATUS } from "../lib/constantes";

export default function PctBadge({ pct }) {
  const zero = Math.abs(pct) < 0.005;
  const cor = zero ? CORES_STATUS.ajustar : pct > 0 ? CORES_STATUS.critico : CORES_STATUS.ok;
  const Icone = zero ? Minus : pct > 0 ? TrendingUp : TrendingDown;
  const txt = zero ? "no recorde" : (pct > 0 ? "+" : "") + Math.round(pct * 100) + "%";
  return (
    <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 4, background: cor.bg, color: cor.fg, fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 14, whiteSpace: "nowrap" }}>
      <Icone size={12} /> {txt}
    </span>
  );
}
