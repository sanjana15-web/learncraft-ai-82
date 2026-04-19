import { useState, useEffect } from "react";
import { BookOpen, Brain, Clock, Library, MessageSquare, Sparkles, FileText, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const quickActions = [
  { title: "Generate Summary", desc: "AI-powered content summaries", icon: FileText, path: "/library", color: "from-primary to-purple-500" },
  { title: "Create Quiz", desc: "Test your knowledge", icon: Brain, path: "/quiz", color: "from-blue-500 to-cyan-500" },
  { title: "Flashcards", desc: "Spaced repetition learning", icon: BookOpen, path: "/flashcards", color: "from-emerald-500 to-teal-500" },
  { title: "AI Chatbot", desc: "Ask questions about content", icon: MessageSquare, path: "/chat", color: "from-orange-500 to-amber-500" },
  { title: "Scrape URL", desc: "Import from the web", icon: Globe, path: "/library", color: "from-pink-500 to-rose-500" },
  { title: "AI Analysis", desc: "Smart content insights", icon: Sparkles, path: "/library", color: "from-violet-500 to-indigo-500" },
];

const quotes = [
  "Small steps, every day. That's how syllabi get conquered.",
  "You don't have to be brilliant — just consistent.",
  "Read it. Question it. Then teach it back to yourself.",
  "Confusion is the first step toward understanding.",
  "An hour of focus beats a day of distraction.",
  "Progress, not perfection.",
  "The notes you revisit are the ones you remember.",
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const h = seconds / 3600;
  return `${h.toFixed(1)}h`;
}

function getDailyQuote(): string {
  const start = new Date(new Date().getFullYear(), 0, 0).getTime();
  const day = Math.floor((Date.now() - start) / 86400000);
  return quotes[day % quotes.length];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    studyTime: 0,
    quizzesTaken: 0,
    flashcardsReviewed: 0,
    contentItems: 0,
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [contentRes, sessionsRes] = await Promise.all([
        supabase.from("content_sources").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("study_sessions").select("*").eq("user_id", user.id),
      ]);

      const sessions = sessionsRes.data || [];
      const totalTime = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
      const quizzes = sessions.filter(s => s.session_type === "quiz").length;
      const flashcards = sessions.filter(s => s.session_type === "flashcard")
        .reduce((sum, s) => sum + (s.items_count || 0), 0);

      setStats({
        studyTime: totalTime,
        quizzesTaken: quizzes,
        flashcardsReviewed: flashcards,
        contentItems: contentRes.count || 0,
      });
    };
    fetchStats();
  }, [user]);

  const statCards = [
    { label: "Study Time", value: formatDuration(stats.studyTime), icon: Clock },
    { label: "Quizzes Taken", value: String(stats.quizzesTaken), icon: Brain },
    { label: "Flashcards", value: String(stats.flashcardsReviewed), icon: BookOpen },
    { label: "Content Items", value: String(stats.contentItems), icon: Library },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Welcome back, {user?.user_metadata?.name || "Student"} 
        </h1>
        <p className="text-muted-foreground mt-1">
          {currentTime.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          {" · "}
          {currentTime.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
        <p className="mt-3 italic text-sm text-muted-foreground/90 font-heading border-l-2 border-primary/40 pl-3">
          "{getDailyQuote()}"
        </p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow hover:border-primary/30">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <s.icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
              </div>
            </div>
            <p className="font-heading text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </motion.div>

      <motion.div variants={item}>
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((a) => (
            <button
              key={a.title}
              onClick={() => navigate(a.path)}
              className="group rounded-2xl border border-border bg-card p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow hover:border-primary/30"
            >
              <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${a.color} mb-3`}>
                <a.icon className="h-5 w-5 text-primary-foreground" strokeWidth={1.75} />
              </div>
              <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors">{a.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{a.desc}</p>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
