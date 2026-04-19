import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) return new Response(JSON.stringify({ error: "URL is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AIacademy/1.0)" }
    });
    if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status}`);

    const html = await response.text();
    // Basic HTML to text extraction
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 10000);

    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;

    return new Response(JSON.stringify({ title, content: text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Scrape error:", e);
    const msg = e instanceof Error ? e.message : "Failed to scrape URL";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
