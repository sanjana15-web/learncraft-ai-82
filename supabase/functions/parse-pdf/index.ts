import { resolvePDFJS } from "https://esm.sh/pdfjs-serverless@0.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    let fullText = "";
    try {
      const { getDocument } = await resolvePDFJS();
      const pdf = await getDocument({
        data: bytes,
        useSystemFonts: true,
        disableFontFace: true,
      }).promise;

      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = (textContent.items as any[])
          .map((item) => item.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (pageText) pages.push(pageText);
      }
      fullText = pages.join("\n\n");
    } catch (parseErr) {
      console.error("pdfjs error:", parseErr);
      return new Response(
        JSON.stringify({
          error: "Failed to parse PDF: " + ((parseErr as Error).message || String(parseErr)),
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!fullText || fullText.trim().length < 10) {
      return new Response(
        JSON.stringify({
          error:
            "Could not extract text from this PDF. It may be a scanned/image-based PDF that requires OCR, or it may be encrypted.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ text: fullText, fileName: file.name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("parse-pdf error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Failed to parse PDF" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
