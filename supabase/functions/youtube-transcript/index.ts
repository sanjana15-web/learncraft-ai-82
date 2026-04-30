import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

class TranscriptUnavailableError extends Error {
  code = "NO_TRANSCRIPT";
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function parseTimedText(xml: string): string {
  const texts: string[] = [];
  const re = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const cleaned = decodeHtml(m[1].replace(/<[^>]+>/g, "")).trim();
    if (cleaned) texts.push(cleaned);
  }
  return texts.join(" ").replace(/\s+/g, " ").trim();
}

async function tryFetchFromWatchPage(videoId: string): Promise<{ title: string; transcript: string } | null> {
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      "Cookie": "CONSENT=YES+1",
    },
  });
  if (!pageRes.ok) return null;
  const html = await pageRes.text();

  const titleMatch = html.match(/<meta name="title" content="([^"]+)"/) || html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? decodeHtml(titleMatch[1].replace(/ - YouTube$/, "")) : `YouTube Video ${videoId}`;

  const captionMatch = html.match(/"captionTracks":(\[.*?\])/);
  if (!captionMatch) return { title, transcript: "" };

  let tracks: Array<{ baseUrl: string; languageCode: string; kind?: string }>;
  try {
    tracks = JSON.parse(captionMatch[1].replace(/\\u0026/g, "&"));
  } catch {
    return { title, transcript: "" };
  }
  if (!tracks.length) return { title, transcript: "" };

  const track =
    tracks.find((t) => t.languageCode === "en" && !t.kind) ||
    tracks.find((t) => t.languageCode === "en") ||
    tracks.find((t) => t.languageCode?.startsWith("en")) ||
    tracks[0];

  let baseUrl = track.baseUrl;
  if (!track.languageCode?.startsWith("en")) baseUrl += "&tlang=en";

  const xmlRes = await fetch(baseUrl);
  if (!xmlRes.ok) return { title, transcript: "" };
  return { title, transcript: parseTimedText(await xmlRes.text()) };
}

async function tryFetchFromTimedText(videoId: string): Promise<string> {
  // Fallback: directly query YouTube's timedtext endpoint
  // Try manual English first, then ASR (auto-generated) English
  const attempts = [
    `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&fmt=srv1`,
    `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&kind=asr&fmt=srv1`,
  ];
  for (const url of attempts) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml.trim()) continue;
      const text = parseTimedText(xml);
      if (text) return text;
    } catch { /* try next */ }
  }
  return "";
}

async function fetchTranscript(videoId: string): Promise<{ title: string; transcript: string }> {
  const watchResult = await tryFetchFromWatchPage(videoId).catch(() => null);
  const title = watchResult?.title ?? `YouTube Video ${videoId}`;
  let transcript = watchResult?.transcript ?? "";

  if (!transcript) {
    transcript = await tryFetchFromTimedText(videoId);
  }

  if (!transcript) {
    throw new TranscriptUnavailableError(
      "This video has no captions available. Try a video where the 'CC' button appears on YouTube, or use the PDF/Web URL importer instead."
    );
  }

  return { title, transcript };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "Invalid YouTube URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, transcript } = await fetchTranscript(videoId);

    return new Response(
      JSON.stringify({ title, content: transcript, videoId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch transcript";

    if (e instanceof TranscriptUnavailableError) {
      return new Response(JSON.stringify({ error: msg, code: e.code, recoverable: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.error("youtube-transcript error:", e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});