import { useState } from "react";
import { LogIn } from "lucide-react";
import { signIn } from "../lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro]   = useState(null);
  const [submetendo, setSubmetendo] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro(null);
    setSubmetendo(true);
    try {
      await signIn(email.trim(), senha);
      // o onAuthChange no App vai trocar a tela automaticamente
    } catch (err) {
      setErro(traduzir(err.message || String(err)));
      setSubmetendo(false);
    }
  }

  const campoStyle = { width: "100%", padding: "11px 13px", border: "1px solid #ddd9cf", borderRadius: 6, fontSize: 15, background: "#fbfaf7", fontFamily: "'IBM Plex Sans', sans-serif" };
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#5b6470", marginBottom: 6, fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: 0.3 };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f5f1", fontFamily: "'Newsreader', Georgia, serif", color: "#2b2b28", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", border: "1px solid #e3e0d8", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,.04)", padding: "32px 28px", width: "100%", maxWidth: 380 }}>
        <div className="mono" style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#b6936a", marginBottom: 6, textAlign: "center" }}>
          Controle de suprimentos
        </div>
        <h1 style={{ margin: "0 0 24px", fontSize: 26, fontWeight: 600, letterSpacing: -0.3, textAlign: "center" }}>
          Compras do Sr. Esperança
        </h1>

        <form onSubmit={entrar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>E-mail</label>
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={campoStyle} autoFocus />
          </div>
          <div>
            <label style={labelStyle}>Senha</label>
            <input type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} style={campoStyle} />
          </div>

          {erro && (
            <div className="mono" style={{ background: "#fbe9e9", color: "#a32d2d", fontSize: 13, padding: "10px 12px", borderRadius: 6 }}>
              {erro}
            </div>
          )}

          <button type="submit" disabled={submetendo}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 18px", border: "none", borderRadius: 6, background: submetendo ? "#c9c6bd" : "#2b2b28", color: "#fff", fontSize: 14, fontWeight: 600, cursor: submetendo ? "default" : "pointer", fontFamily: "'IBM Plex Sans', sans-serif", marginTop: 4 }}>
            <LogIn size={16} /> {submetendo ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mono" style={{ fontSize: 11.5, color: "#9b9b94", textAlign: "center", marginTop: 18, lineHeight: 1.5 }}>
          Acesso restrito. Se ainda não tens conta, peça ao admin para criar.
        </div>
      </div>
    </div>
  );
}

function traduzir(msg) {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme o e-mail antes de entrar.";
  if (m.includes("network")) return "Sem conexão. Verifique a internet.";
  return msg;
}
