import { Pill, Sparkles, Droplets } from "lucide-react";

export const CATEGORIAS = [
  { id: "medicamentos", nome: "Medicamentos",        curto: "Medicamentos", Icone: Pill,     temPosologia: true  },
  { id: "higiene",      nome: "Higiene Pessoal",     curto: "Higiene",      Icone: Sparkles, temPosologia: false },
  { id: "sondagem",     nome: "Irrigação e Sondagem",curto: "Sondagem",     Icone: Droplets, temPosologia: false },
];

export const catInfo = (id) => CATEGORIAS.find((c) => c.id === id);

export function calcularStatus(item) {
  if (item.consumo === 0)                  return { label: "AJUSTAR",     tipo: "ajustar", ordem: 4 };
  if (item.estoque === 0)                  return { label: "SEM ESTOQUE", tipo: "critico", ordem: 0 };
  if (item.estoque <= item.minimo)         return { label: "COMPRAR",     tipo: "critico", ordem: 1 };
  if (item.estoque <= item.minimo * 1.5)   return { label: "ATENÇÃO",     tipo: "atencao", ordem: 2 };
  return                                          { label: "OK",          tipo: "ok",      ordem: 3 };
}

export function qtdSugerida(item) {
  if (item.consumo > 0) return Math.max(item.consumo + item.minimo - item.estoque, item.consumo);
  return Math.max(item.minimo - item.estoque, 0);
}

export const CORES_STATUS = {
  ok:      { bg: "#e7f4ec", fg: "#1a7544", dot: "#2a9d63" },
  atencao: { bg: "#fdf4e0", fg: "#9a6b15", dot: "#d99b1f" },
  critico: { bg: "#fbe9e9", fg: "#a32d2d", dot: "#cf4040" },
  ajustar: { bg: "#eef0f2", fg: "#5b6470", dot: "#8b95a1" },
};
