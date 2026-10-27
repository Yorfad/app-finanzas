import type { CloudAdapter } from '../data/cloud';
import { createSupabaseCloud } from '../data/supabaseCloud';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let instance: Promise<CloudAdapter> | undefined;

/** null si no hay variables de entorno: la app queda en modo solo-local. */
export const createCloud =
  url && key
    ? () => (instance ??= createSupabaseCloud(url, key, window.location.origin + import.meta.env.BASE_URL))
    : null;
