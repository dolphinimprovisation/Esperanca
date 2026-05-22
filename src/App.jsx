import { useEffect, useState } from "react";
import { Package, ShoppingCart, History, Store, LogOut } from "lucide-react";
import Estoque from "./screens/Estoque";
import Compras from "./screens/Compras";
import Historico from "./screens/Historico";
import Fornecedores from "./screens/Fornecedores";
import Login from "./screens/Login";
import { getSession, onAuthChange, signOut } from "./lib/auth";

function NavBtn({ ativo, onClick, Icone, label, badge }) {
  return (
    <button className="navpill mono" onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, cursor: "pointer",
        border: ativo ? "1px solid #2b2b28" : "1px solid #e3e0d8", background: ativo ? "#2b2b28" : "#fff",
        color: ativo ? "#f6f5f1" : "#5b6470", fontSize: 14, fontWeight: 600 }}>
      <Icone size={17} /> {label}
      {badge > 0 && (
        <span style={{ background: ativo ? "#f6f5f1" : "#cf4040", color: ativo ? "#2b2b28" : "#fff", fontSize: 11, fontWeight: 700, borderRadius: 10, padding: "1px 7px" }}>
          {badge}
        </span>
      )}
    </button>
  );
}

const ESTILO_GLOBAL = `
  @import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; }
  .mono { font-family: 'IBM Plex Sans', sans-serif; }
  .tab-btn { transition: all .18s ease; }
  .tab-btn:hover { background: #ece9e2; }
  .row:hover { background: #faf9f6; }
  .icon-btn { transition: all .15s ease; cursor: pointer; border: none; background: transparent; }
  .icon-btn:hover { transform: scale(1.12); }
  .add-btn:hover { background: #2b2b28 !important; color: #f6f5f1 !important; }
  .navpill { transition: all .2s ease; }
  input:focus, select:focus { outline: 2px solid #b6936a; outline-offset: 1px; }
`;

export default function App() {
  const [tela, setTela]       = useState("estoque");
  const [session, setSession] = useState(null);
  const [iniciando, setIniciando] = useState(true);

  useEffect(() => {
    let mounted = true;
    getSession().then((s) => {
      if (!mounted) return;
      setSession(s);
      setIniciando(false);
    }).catch(() => setIniciando(false));
    const unsub = onAuthChange((s) => setSession(s));
    return () => { mounted = false; unsub(); };
  }, []);

  if (iniciando) {
    return (
      <div style={{ minHeight: "100vh", background: "#f6f5f1", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans', sans-serif", color: "#9b9b94", fontSize: 14 }}>
        <style>{ESTILO_GLOBAL}</style>
        Carregando...
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <style>{ESTILO_GLOBAL}</style>
        <Login />
      </>
    );
  }

  const email = session.user?.email || "";

  return (
    <div style={{ minHeight: "100vh", background: "#f6f5f1", fontFamily: "'Newsreader', Georgia, serif", color: "#2b2b28" }}>
      <style>{ESTILO_GLOBAL}</style>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 24px 80px" }}>
        <header style={{ marginBottom: 22, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="mono" style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#b6936a", marginBottom: 6 }}>
              Controle de suprimentos
            </div>
            <h1 style={{ margin: 0, fontSize: 33, fontWeight: 600, letterSpacing: -0.5 }}>
              Compras do Sr. Esperança
            </h1>
          </div>
          <div className="mono" style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12.5, color: "#5b6470" }}>
            <span>{email}</span>
            <button onClick={() => signOut()} title="Sair"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", border: "1px solid #ddd9cf", borderRadius: 6, background: "#fff", color: "#5b6470", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              <LogOut size={13} /> Sair
            </button>
          </div>
        </header>

        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          <NavBtn ativo={tela === "estoque"}      onClick={() => setTela("estoque")}      Icone={Package}      label="Estoque" />
          <NavBtn ativo={tela === "compras"}      onClick={() => setTela("compras")}      Icone={ShoppingCart} label="Compras / Cotação" />
          <NavBtn ativo={tela === "historico"}    onClick={() => setTela("historico")}    Icone={History}      label="Histórico" />
          <NavBtn ativo={tela === "fornecedores"} onClick={() => setTela("fornecedores")} Icone={Store}        label="Fornecedores" />
        </div>

        {tela === "estoque"      && <Estoque />}
        {tela === "compras"      && <Compras />}
        {tela === "historico"    && <Historico />}
        {tela === "fornecedores" && <Fornecedores />}
      </div>
    </div>
  );
}
