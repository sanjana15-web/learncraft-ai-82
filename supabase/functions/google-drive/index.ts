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
    .from("google_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("Google account not connected");

  if (new Date(row.expires_at).getTime() > Date.now() + 30000) {
    return row.access_token;
  }

  // refresh
  const CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!;
  const CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Refresh failed: ${JSON.stringify(data)}`);
  const expires_at = new Date(Date.now() + (data.expires_in - 60) * 1000).toISOString();
  await admin.from("google_tokens").update({
    access_token: data.access_token,
    expires_at,
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

    const { action, query, fileId, mimeType } = await req.json();
    const accessToken = await getValidAccessToken(user.id);

    if (action === "list") {
      const q = [
        "trashed = false",
        "(mimeType = 'application/pdf' or mimeType = 'text/plain' or mimeType contains 'document' or mimeType = 'application/vnd.google-apps.document')",
        query ? `name contains '${String(query).replace(/'/g, "\\'")}'` : null,
      ].filter(Boolean).join(" and ");

      const params = new URLSearchParams({
        q,
        pageSize: "30",
        fields: "files(id,name,mimeType,modifiedTime,iconLink,size)",
        orderBy: "modifiedTime desc",
      });
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(`Drive list failed: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "import") {
      // Get metadata
      const metaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const meta = await metaRes.json();
      if (!metaRes.ok) throw new Error(`Drive meta failed: ${JSON.stringify(meta)}`);

      let text = "";
      if (meta.mimeType === "application/vnd.google-apps.document") {
        const expRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        text = await expRes.text();
      } else if (meta.mimeType === "application/pdf") {
        // Download PDF bytes, then parse via existing parse-pdf function
        const dlRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const blob = await dlRes.blob();
        const fd = new FormData();
        fd.append("file", new File([blob], meta.name, { type: "application/pdf" }));
        const parseRes = await fetch(
          `${SUPABASE_URL}/functions/v1/parse-pdf`,
          { method: "POST", headers: { Authorization: authHeader }, body: fd }
        );
        const parsed = await parseRes.json();
        if (!parseRes.ok || parsed.error) throw new Error(parsed.error || "PDF parse failed");
        text = parsed.text;
      } else {
        const dlRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        text = await dlRes.text();
      }

      return new Response(JSON.stringify({ title: meta.name, content: text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const needsAuth = msg.includes("not connected") || msg.includes("invalid_grant");
    return new Response(JSON.stringify({ error: msg, needsAuth }), {
      status: needsAuth ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});