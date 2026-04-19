import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, MessageSquare, Layers, Zap, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import logo from "@/assets/aiacademy-logo.jpeg";

const features = [
  { icon: Brain, title: "Quizzes that stick", desc: "Turn your notes into multiple-choice questions and get feedback as you go — no more passive re-reading." },
  { icon: Layers, title: "Flashcards, done for you", desc: "Skip the busywork. We pull out the key ideas and shape them into cards you can actually flip through." },
  { icon: MessageSquare, title: "Ask your notes anything", desc: "Stuck on a concept? Have a conversation with your own material until it clicks." },
  { icon: Zap, title: "One place for everything", desc: "Drop in a PDF, paste an article, or share a link. Your whole syllabus in one tidy library." },
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
            <div className="rounded-xl overflow-hidden">
              <img src={logo} alt="AIacademy logo" className="h-10 w-10 object-cover" />
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
              <Sparkles className="h-3.5 w-3.5" /> A calmer way to study
            </span>
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-medium leading-[1.05] mb-6 tracking-tight">
              Study like you actually <em className="text-gradient not-italic font-semibold">enjoy it.</em>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              Bring in your notes, slides, or readings — and turn them into quizzes, flashcards, and conversations you can learn from. No fluff, no overwhelm.
            </p>
            <Link to="/auth">
              <Button variant="gradient" size="lg" className="text-base px-8 shadow-glow">
                Try it free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl md:text-4xl font-medium mb-3">Built around how people actually learn</h2>
          <p className="text-muted-foreground">Upload once. Revisit it however helps you most.</p>
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
          <h2 className="font-heading text-2xl md:text-3xl font-medium mb-3">Give your next study session a head start.</h2>
          <p className="text-muted-foreground mb-6">Free to use. No card, no clutter — just your notes and a quieter way to revise.</p>
          <Link to="/auth">
            <Button variant="gradient" size="lg" className="shadow-glow">
              Get started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} AIacademy — made for curious students.</p>
          <nav className="flex items-center gap-6">
            <Link to="/about" className="hover:text-primary transition-colors">About</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
