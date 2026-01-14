import { supabaseAdmin } from "./supabaseAdmin";

export async function getUserFromBearer(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}
