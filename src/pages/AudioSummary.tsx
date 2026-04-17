import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Headphones, Loader2, Play, Pause, Square, Sparkles, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";

interface ContentSource {
  id: string;
  title: string;
  content: string;
}

type SpeakState = "idle" | "playing" | "paused";

export default function AudioSummary() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [contents, setContents] = useState<ContentSource[]>([]);
  const [contentId, setContentId] = useState<string>("");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [voiceURI, setVoiceURI] = useState<string>("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState("");
  const [speakState, setSpeakState] = useState<SpeakState>("idle");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load content sources
  useEffect(() => {
    if (!user) return;
    supabase
      .from("content_sources")
      .select("id,title,content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setContents(data || []);
        const preselect = searchParams.get("contentId");
        if (preselect && data?.some((d) => d.id === preselect)) setContentId(preselect);
      });
  }, [user, searchParams]);

  // Load TTS voices
  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
      if (v.length && !voiceURI) {
        const preferred =
          v.find((x) => /en[-_]?US/i.test(x.lang) && /female|samantha|google/i.test(x.name)) ||
          v.find((x) => /^en/i.test(x.lang)) ||
          v[0];
        setVoiceURI(preferred.voiceURI);
      }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const generate = async () => {
    const source = contents.find((c) => c.id === contentId);
    if (!source) return toast.error("Select a content source first");
    setGenerating(true);
    setSummary("");
    stopSpeaking();
    try {
      // Trim very large content client-side to keep request small & fast
      const MAX = 12000;
      const payload = source.content.length > MAX ? source.content.slice(0, MAX) : source.content;
      const { data, error } = await supabase.functions.invoke("ai-summary", {
        body: { content: payload, length },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.summary) throw new Error("No summary returned");
      setSummary(data.summary);
      toast.success("Summary ready! Hit play to listen.");
    } catch (e: any) {
      console.error("ai-summary error:", e);
      toast.error(e.message || "Failed to generate summary");
    }
    setGenerating(false);
  };

  const speak = () => {
    if (!summary) return;
    if (speakState === "paused") {
      window.speechSynthesis.resume();
      setSpeakState("playing");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(summary);
    const v = voices.find((x) => x.voiceURI === voiceURI);
    if (v) u.voice = v;
    u.rate = 1;
    u.pitch = 1;
    u.onend = () => setSpeakState("idle");
    u.onerror = () => setSpeakState("idle");
    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
    setSpeakState("playing");
  };

  const pauseSpeaking = () => {
    window.speechSynthesis.pause();
    setSpeakState("paused");
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeakState("idle");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Headphones className="h-6 w-6 text-primary" />
          Audio Summary
        </h1>
        <p className="text-muted-foreground mt-1">
          Turn any content into a spoken summary you can listen to anywhere.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Content Source</Label>
            <Select value={contentId} onValueChange={setContentId}>
              <SelectTrigger><SelectValue placeholder="Choose your study material" /></SelectTrigger>
              <SelectContent>
                {contents.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No content yet — add some in the Library</div>
                ) : contents.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Summary Length</Label>
            <Select value={length} onValueChange={(v) => setLength(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short (~45s)</SelectItem>
                <SelectItem value="medium">Medium (~2 min)</SelectItem>
                <SelectItem value="long">Long (~4 min)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Volume2 className="h-3.5 w-3.5" /> Voice</Label>
          <Select value={voiceURI} onValueChange={setVoiceURI}>
            <SelectTrigger><SelectValue placeholder="Default voice" /></SelectTrigger>
            <SelectContent>
              {voices.map((v) => (
                <SelectItem key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="gradient"
          onClick={generate}
          disabled={generating || !contentId}
          className="w-full"
        >
          {generating ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating summary...</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" />Generate Audio Summary</>
          )}
        </Button>
      </div>

      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-heading font-semibold text-foreground">Your Summary</h2>
            <div className="flex items-center gap-2">
              {speakState !== "playing" ? (
                <Button size="sm" variant="gradient" onClick={speak}>
                  <Play className="h-4 w-4 mr-1" />
                  {speakState === "paused" ? "Resume" : "Play"}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={pauseSpeaking}>
                  <Pause className="h-4 w-4 mr-1" />Pause
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={stopSpeaking} disabled={speakState === "idle"}>
                <Square className="h-4 w-4 mr-1" />Stop
              </Button>
            </div>
          </div>

          {speakState === "playing" && (
            <div className="flex items-center gap-2 text-xs text-primary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Now playing
            </div>
          )}

          <ScrollArea className="max-h-[50vh] pr-4">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{summary}</p>
          </ScrollArea>
        </motion.div>
      )}
    </motion.div>
  );
}
