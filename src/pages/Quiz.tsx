import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, CheckCircle, XCircle, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Question {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct: string;
  explanation: string;
}

export default function Quiz() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [contents, setContents] = useState<{ id: string; title: string; content: string }[]>([]);
  const [selectedContent, setSelectedContent] = useState(searchParams.get("contentId") || "");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [numQuestions, setNumQuestions] = useState("5");

  useEffect(() => {
    if (!user) return;
    supabase.from("content_sources").select("id, title, content").eq("user_id", user.id).then(({ data }) => {
      setContents(data || []);
    });
  }, [user]);

  const generateQuiz = async () => {
    if (!selectedContent) { toast.error("Select content first"); return; }
    const c = contents.find(x => x.id === selectedContent);
    if (!c) return;
    setGenerating(true);
    setQuestions([]); setCurrentQ(0); setScore(0); setQuizDone(false); setSelected(null); setShowResult(false);
    try {
      const { data, error } = await supabase.functions.invoke("ai-quiz", {
        body: { content: c.content, numQuestions: parseInt(numQuestions) },
      });
      if (error) throw error;
      setQuestions(data.questions);
      toast.success("Quiz generated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate quiz");
    }
    setGenerating(false);
  };

  const [startTime] = useState(Date.now());

  const handleAnswer = (key: string) => {
    if (showResult) return;
    setSelected(key);
    setShowResult(true);
    if (key === questions[currentQ].correct) setScore(s => s + 1);
  };

  const recordSession = async (finalScore: number) => {
    if (!user) return;
    const duration = Math.round((Date.now() - startTime) / 1000);
    await supabase.from("study_sessions").insert({
      user_id: user.id,
      session_type: "quiz",
      duration_seconds: duration,
      score: finalScore,
      items_count: questions.length,
      content_source_id: selectedContent || null,
    });
  };

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      const finalScore = score + (selected === questions[currentQ]?.correct ? 1 : 0);
      setQuizDone(true);
      recordSession(finalScore);
      return;
    }
    setCurrentQ(q => q + 1);
    setSelected(null);
    setShowResult(false);
  };

  const q = questions[currentQ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Quiz Generator</h1>
        <p className="text-muted-foreground mt-1">Test your knowledge with AI-generated quizzes</p>
      </div>

      {questions.length === 0 && !generating && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Select Content</label>
            <Select value={selectedContent} onValueChange={setSelectedContent}>
              <SelectTrigger><SelectValue placeholder="Choose study material" /></SelectTrigger>
              <SelectContent>
                {contents.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Number of Questions</label>
            <Select value={numQuestions} onValueChange={setNumQuestions}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["3", "5", "10", "15"].map(n => <SelectItem key={n} value={n}>{n} questions</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="gradient" onClick={generateQuiz} className="w-full">
            <Brain className="h-4 w-4 mr-2" />Generate Quiz
          </Button>
        </div>
      )}

      {generating && (
        <div className="flex flex-col items-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Generating quiz questions...</p>
        </div>
      )}

      {q && !quizDone && (
        <AnimatePresence mode="wait">
          <motion.div key={currentQ} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            className="rounded-2xl border border-border bg-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Question {currentQ + 1} of {questions.length}</span>
              <span className="text-xs font-medium text-primary">Score: {score}/{currentQ + (showResult ? 1 : 0)}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-secondary">
              <div className="h-full rounded-full gradient-primary transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
            </div>
            <h2 className="font-heading text-lg font-semibold text-foreground">{q.question}</h2>
            <div className="grid gap-3">
              {(Object.entries(q.options) as [string, string][]).map(([key, val]) => {
                let cls = "rounded-xl border p-4 text-left w-full transition-all text-sm ";
                if (showResult) {
                  if (key === q.correct) cls += "border-success bg-success/10 text-foreground";
                  else if (key === selected) cls += "border-destructive bg-destructive/10 text-foreground";
                  else cls += "border-border bg-card text-muted-foreground opacity-50";
                } else {
                  cls += "border-border bg-card text-foreground hover:border-primary hover:bg-primary/5 cursor-pointer";
                }
                return (
                  <button key={key} onClick={() => handleAnswer(key)} className={cls} disabled={showResult}>
                    <span className="font-medium mr-2">{key}.</span>{val}
                    {showResult && key === q.correct && <CheckCircle className="inline ml-2 h-4 w-4 text-success" />}
                    {showResult && key === selected && key !== q.correct && <XCircle className="inline ml-2 h-4 w-4 text-destructive" />}
                  </button>
                );
              })}
            </div>
            {showResult && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-secondary/50 p-4 border border-border">
                <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Explanation: </span>{q.explanation}</p>
              </motion.div>
            )}
            {showResult && (
              <Button variant="gradient" onClick={nextQuestion} className="w-full">
                {currentQ + 1 >= questions.length ? "See Results" : "Next Question"}
              </Button>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {quizDone && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="inline-flex gradient-primary rounded-full p-4 mb-4 shadow-glow">
            <Brain className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Quiz Complete!</h2>
          <p className="text-4xl font-bold text-gradient mt-4">{score}/{questions.length}</p>
          <p className="text-muted-foreground mt-2">{Math.round((score / questions.length) * 100)}% correct</p>
          <div className="flex gap-3 mt-6 justify-center">
            <Button variant="gradient" onClick={() => { setQuestions([]); setQuizDone(false); }}>
              <RotateCcw className="h-4 w-4 mr-2" />New Quiz
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
