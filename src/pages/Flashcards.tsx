import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, ChevronLeft, ChevronRight, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Card { front: string; back: string }

export default function Flashcards() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [contents, setContents] = useState<{ id: string; title: string; content: string }[]>([]);
  const [selectedContent, setSelectedContent] = useState(searchParams.get("contentId") || "");
  const [cards, setCards] = useState<Card[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [numCards, setNumCards] = useState("10");

  useEffect(() => {
    if (!user) return;
    supabase.from("content_sources").select("id, title, content").eq("user_id", user.id).then(({ data }) => setContents(data || []));
  }, [user]);

  const [startTime, setStartTime] = useState(Date.now());

  const recordSession = async (cardCount: number) => {
    if (!user) return;
    const duration = Math.round((Date.now() - startTime) / 1000);
    await supabase.from("study_sessions").insert({
      user_id: user.id,
      session_type: "flashcard",
      duration_seconds: duration,
      items_count: cardCount,
      content_source_id: selectedContent || null,
    });
  };

  const generate = async () => {
    if (!selectedContent) { toast.error("Select content first"); return; }
    const c = contents.find(x => x.id === selectedContent);
    if (!c) return;
    setGenerating(true);
    setStartTime(Date.now());
    try {
      const { data, error } = await supabase.functions.invoke("ai-flashcards", { body: { content: c.content, numCards: parseInt(numCards) } });
      if (error) throw error;
      setCards(data.flashcards);
      setCurrent(0); setFlipped(false);
      toast.success("Flashcards generated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate");
    }
    setGenerating(false);
  };

  // Record session when user finishes all cards
  useEffect(() => {
    if (cards.length > 0 && current === cards.length - 1 && flipped) {
      recordSession(cards.length);
    }
  }, [current, flipped, cards.length]);

  const prev = () => { setCurrent(c => Math.max(0, c - 1)); setFlipped(false); };
  const next = () => { setCurrent(c => Math.min(cards.length - 1, c + 1)); setFlipped(false); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6 px-1 sm:px-0">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Flashcards</h1>
        <p className="text-muted-foreground mt-1">Study with AI-generated flashcards</p>
      </div>

      {cards.length === 0 && !generating && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <Select value={selectedContent} onValueChange={setSelectedContent}>
            <SelectTrigger><SelectValue placeholder="Choose study material" /></SelectTrigger>
            <SelectContent>{contents.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={numCards} onValueChange={setNumCards}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["5", "10", "15", "20"].map(n => <SelectItem key={n} value={n}>{n} cards</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="gradient" onClick={generate} className="w-full"><BookOpen className="h-4 w-4 mr-2" />Generate Flashcards</Button>
        </div>
      )}

      {generating && (
        <div className="flex flex-col items-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Creating flashcards...</p>
        </div>
      )}

      {cards.length > 0 && (
        <>
          <div className="text-center text-sm text-muted-foreground">Card {current + 1} of {cards.length} — Click card to flip</div>
          <div className="perspective-1000 cursor-pointer" onClick={() => setFlipped(f => !f)} style={{ perspective: "1000px" }}>
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.5 }}
              style={{ transformStyle: "preserve-3d" }}
              className="relative h-64 sm:h-72 w-full"
            >
              <div className="absolute inset-0 rounded-2xl border border-border bg-card p-5 sm:p-8 flex items-center justify-center shadow-glow backface-hidden overflow-hidden"
                style={{ backfaceVisibility: "hidden" }}>
                <div className="text-center w-full max-h-full overflow-y-auto">
                  <span className="text-xs text-primary font-medium mb-3 sm:mb-4 block">QUESTION</span>
                  <p className="font-heading text-base sm:text-xl font-semibold text-foreground break-words">{cards[current].front}</p>
                </div>
              </div>
              <div className="absolute inset-0 rounded-2xl border border-primary/30 gradient-accent p-5 sm:p-8 flex items-center justify-center backface-hidden overflow-hidden"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                <div className="text-center w-full max-h-full overflow-y-auto">
                  <span className="text-xs text-primary font-medium mb-3 sm:mb-4 block">ANSWER</span>
                  <p className="text-foreground text-sm sm:text-lg break-words">{cards[current].back}</p>
                </div>
              </div>
            </motion.div>
          </div>
          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
            <Button variant="outline" size="icon" onClick={prev} disabled={current === 0}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="gradient" onClick={() => { setCards([]); setCurrent(0); }}><RotateCcw className="h-4 w-4 mr-2" />New Set</Button>
            <Button variant="outline" size="icon" onClick={next} disabled={current === cards.length - 1}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </>
      )}
    </motion.div>
  );
}
