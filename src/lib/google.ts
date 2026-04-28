import { supabase } from "@/integrations/supabase/client";

export async function startGoogleOAuth(returnTo?: string) {
  if (returnTo) sessionStorage.setItem("google_oauth_return", returnTo);
  const redirect_uri = `${window.location.origin}/google-callback`;
  const { data, error } = await supabase.functions.invoke("google-oauth", {
    body: { action: "get_url", redirect_uri },
  });
  if (error || data?.error) throw new Error(data?.error || error?.message || "Failed to start OAuth");
  window.location.href = data.url;
}

export async function isGoogleConnected(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("google_tokens")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}