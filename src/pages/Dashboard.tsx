import { BookOpen, Brain, Clock, Library, MessageSquare, Sparkles, FileText, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const stats = [
  { label: "Study Time", value: "12.5h", change: "+0.8h", icon: Clock },
  { label: "Quizzes Taken", value: "24", change: "+2", icon: Brain },
  { label: "Flashcards", value: "156", change: "+12", icon: BookOpen },
  { label: "Content Items", value: "8", change: "+1", icon: Library },
];

const quickActions = [
  { title: "Generate Summary", desc: "AI-powered content summaries", icon: FileText, path: "/library", color: "from-primary to-purple-500" },
  { title: "Create Quiz", desc: "Test your knowledge", icon: Brain, path: "/quiz", color: "from-blue-500 to-cyan-500" },
  { title: "Flashcards", desc: "Spaced repetition learning", icon: BookOpen, path: "/flashcards", color: "from-emerald-500 to-teal-500" },
  { title: "AI Chatbot", desc: "Ask questions about content", icon: MessageSquare, path: "/chat", color: "from-orange-500 to-amber-500" },
  { title: "Scrape URL", desc: "Import from the web", icon: Globe, path: "/library", color: "from-pink-500 to-rose-500" },
  { title: "AI Analysis", desc: "Smart content insights", icon: Sparkles, path: "/library", color: "from-violet-500 to-indigo-500" },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Welcome back, {user?.user_metadata?.name || "Student"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here's your learning overview</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 hover:shadow-glow transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs text-success font-medium">{s.change}</span>
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
              className="group rounded-2xl border border-border bg-card p-5 text-left hover:shadow-glow transition-all hover:border-primary/30"
            >
              <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${a.color} mb-3`}>
                <a.icon className="h-5 w-5 text-primary-foreground" />
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
