import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;

if (!url || !key) {
  throw new Error(
    "Faltam variáveis de ambiente: VITE_SUPABASE_URL e VITE_SUPABASE_KEY. Verifica o .env.local."
  );
}

export const supabase = createClient(url, key);
