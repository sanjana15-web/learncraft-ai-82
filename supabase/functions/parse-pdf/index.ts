import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Simple PDF text extraction - handles most text-based PDFs
function extractTextFromPdf(bytes: Uint8Array): string {
  const text = new TextDecoder("latin1").decode(bytes);
  const textObjects: string[] = [];

  // Extract text between BT and ET markers (PDF text objects)
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(text)) !== null) {
    const block = match[1];
    // Extract strings in parentheses (literal strings)
    const strRegex = /\(([^)]*)\)/g;
    let strMatch;
    while ((strMatch = strRegex.exec(block)) !== null) {
      const decoded = strMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\\\/g, "\\")
        .replace(/\\([()])/g, "$1");
      if (decoded.trim()) textObjects.push(decoded);
    }
    // Extract hex strings
    const hexRegex = /<([0-9A-Fa-f\s]+)>/g;
    let hexMatch;
    while ((hexMatch = hexRegex.exec(block)) !== null) {
      const hex = hexMatch[1].replace(/\s/g, "");
      let hexStr = "";
      for (let i = 0; i < hex.length; i += 2) {
        const code = parseInt(hex.substring(i, i + 2), 16);
        if (code >= 32 && code < 127) hexStr += String.fromCharCode(code);
      }
      if (hexStr.trim()) textObjects.push(hexStr);
    }
  }

  return textObjects.join(" ").replace(/\s+/g, " ").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    let text = extractTextFromPdf(bytes);

    // If our simple parser got very little, try a basic stream decode
    if (text.length < 50) {
      // Fallback: extract any readable ASCII sequences
      const raw = new TextDecoder("latin1").decode(bytes);
      const readable = raw.match(/[A-Za-z][A-Za-z0-9\s.,;:!?'"()-]{10,}/g) || [];
      text = readable.join(" ").trim();
    }

    if (!text || text.length < 10) {
      return new Response(
        JSON.stringify({ error: "Could not extract text from this PDF. It may be image-based or encrypted." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ text, fileName: file.name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "Failed to parse PDF" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
