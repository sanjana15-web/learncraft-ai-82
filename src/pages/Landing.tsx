import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Brain, MessageSquare, Layers, Zap, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Brain, title: "AI Quizzes", desc: "Auto-generated multiple choice questions from your study material with instant feedback." },
  { icon: Layers, title: "Smart Flashcards", desc: "AI-crafted flashcards with 3D flip animations for effective memorization." },
  { icon: MessageSquare, title: "Study Chatbot", desc: "Ask questions about your content and get contextual AI-powered answers." },
  { icon: Zap, title: "Content Library", desc: "Upload PDFs, paste text, or scrape URLs — all your study material in one place." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2">
            <div className="gradient-primary rounded-xl p-2">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold">AIacademy</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button variant="gradient" size="sm">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%)]" />
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" /> Powered by AI
            </span>
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
              Study smarter with<br />
              <span className="text-gradient">AI-powered learning</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-10">
              Upload your study materials and let AI generate quizzes, flashcards, and summaries. Chat with your content and ace every exam.
            </p>
            <Link to="/auth">
              <Button variant="gradient" size="lg" className="text-base px-8 shadow-glow">
                Start Learning Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl font-bold mb-3">Everything you need to study</h2>
          <p className="text-muted-foreground">Upload once, learn in multiple ways — all powered by AI.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="rounded-2xl border border-border bg-card/50 p-6 hover:border-primary/30 transition-colors"
            >
              <div className="gradient-primary rounded-xl p-2.5 w-fit mb-4">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-heading text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <div className="rounded-2xl gradient-card border border-border p-10">
          <h2 className="font-heading text-2xl font-bold mb-3">Ready to ace your exams?</h2>
          <p className="text-muted-foreground mb-6">Join AIacademy and transform how you study — for free.</p>
          <Link to="/auth">
            <Button variant="gradient" size="lg" className="shadow-glow">
              Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} AIacademy. Built with ❤️ and AI.
      </footer>
    </div>
  );
}
