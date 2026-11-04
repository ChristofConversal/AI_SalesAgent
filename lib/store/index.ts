import { fileStore } from "./file";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

export function getStore(): Store {
  return process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseStore : fileStore;
}

export type * from "./types";
