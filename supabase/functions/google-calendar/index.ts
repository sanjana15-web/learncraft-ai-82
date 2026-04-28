import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getValidAccessToken(userId: string): Promise<string> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: row, error } = await admin
    .from("google_tokens").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("Google account not connected");

  if (new Date(row.expires_at).getTime() > Date.now() + 30000) return row.access_token;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!,
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Refresh failed: ${JSON.stringify(data)}`);
  const expires_at = new Date(Date.now() + (data.expires_in - 60) * 1000).toISOString();
  await admin.from("google_tokens").update({
    access_token: data.access_token, expires_at,
  }).eq("user_id", userId);
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Invalid session");

    const { title, description, startISO, durationMinutes } = await req.json();
    if (!title || !startISO) throw new Error("title and startISO required");

    const accessToken = await getValidAccessToken(user.id);
    const start = new Date(startISO);
    const end = new Date(start.getTime() + (durationMinutes || 30) * 60000);

    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: title,
          description: description || "Study session created from AIacademy",
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
          reminders: { useDefault: true },
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(`Calendar event failed: ${JSON.stringify(data)}`);
    return new Response(JSON.stringify({ success: true, htmlLink: data.htmlLink }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const needsAuth = msg.includes("not connected") || msg.includes("invalid_grant");
    return new Response(JSON.stringify({ error: msg, needsAuth }), {
      status: needsAuth ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});