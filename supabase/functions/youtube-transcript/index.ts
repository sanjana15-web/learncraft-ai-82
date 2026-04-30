import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

async function fetchTranscript(videoId: string): Promise<{ title: string; transcript: string }> {
  // Fetch the video page to get caption tracks + title
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!pageRes.ok) throw new Error(`Failed to load video page (${pageRes.status})`);
  const html = await pageRes.text();

  const titleMatch = html.match(/<meta name="title" content="([^"]+)"/) || html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? decodeHtml(titleMatch[1].replace(/ - YouTube$/, "")) : `YouTube Video ${videoId}`;

  // Find captionTracks JSON in the page
  const captionMatch = html.match(/"captionTracks":(\[.*?\])/);
  if (!captionMatch) {
    throw new Error(
      "This video has no captions or transcript available. Try a video that shows the 'CC' (closed captions) button on YouTube."
    );
  }

  let tracks: Array<{ baseUrl: string; languageCode: string; kind?: string }>;
  try {
    tracks = JSON.parse(captionMatch[1].replace(/\\u0026/g, "&"));
  } catch {
    throw new Error("Failed to parse caption tracks");
  }
  if (!tracks.length) throw new Error("No caption tracks found");

  // Prefer English manual captions, then any English, then first available
  const track =
    tracks.find((t) => t.languageCode === "en" && !t.kind) ||
    tracks.find((t) => t.languageCode === "en") ||
    tracks.find((t) => t.languageCode?.startsWith("en")) ||
    tracks[0];

  // Force English translation if track isn't English (helps with ASR/auto-generated tracks)
  let baseUrl = track.baseUrl;
  if (!track.languageCode?.startsWith("en")) {
    baseUrl += "&tlang=en";
  }

  const xmlRes = await fetch(baseUrl);
  if (!xmlRes.ok) throw new Error(`Failed to fetch caption track (${xmlRes.status})`);
  const xml = await xmlRes.text();

  // Parse <text> nodes
  const texts: string[] = [];
  const re = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const cleaned = decodeHtml(m[1].replace(/<[^>]+>/g, "")).trim();
    if (cleaned) texts.push(cleaned);
  }

  const transcript = texts.join(" ").replace(/\s+/g, " ").trim();
  if (!transcript) throw new Error("Transcript is empty");

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
    console.error("youtube-transcript error:", e);
    const msg = e instanceof Error ? e.message : "Failed to fetch transcript";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});