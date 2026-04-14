import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, Loader2, Bot, User } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface Message { role: "user" | "assistant"; content: string }

export default function Chatbot() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [contents, setContents] = useState<{ id: string; title: string; content: string }[]>([]);
  const [selectedContent, setSelectedContent] = useState(searchParams.get("contentId") || "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("content_sources").select("id, title, content").eq("user_id", user.id).then(({ data }) => setContents(data || []));
  }, [user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !selectedContent) { if (!selectedContent) toast.error("Select content first"); return; }
    const c = contents.find(x => x.id === selectedContent);
    if (!c) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { content: c.content, message: userMsg.content, chatHistory: messages },
      });
      if (error) throw error;
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch (e: any) {
      toast.error(e.message || "Failed to get response");
    }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100vh-7rem)] max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">AI Chatbot</h1>
          <p className="text-muted-foreground text-sm">Ask questions about your study material</p>
        </div>
        <Select value={selectedContent} onValueChange={v => { setSelectedContent(v); setMessages([]); }}>
          <SelectTrigger className="w-60"><SelectValue placeholder="Select content" /></SelectTrigger>
          <SelectContent>{contents.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto rounded-2xl border border-border bg-card p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 opacity-30" />
            <p className="font-heading text-lg">Start a conversation</p>
            <p className="text-sm mt-1">Ask anything about your selected study material</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="shrink-0 h-8 w-8 rounded-full gradient-primary flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === "user" ? "gradient-primary text-primary-foreground" : "bg-secondary text-foreground"
            }`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
              ) : msg.content}
            </div>
            {msg.role === "user" && (
              <div className="shrink-0 h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                <User className="h-4 w-4 text-foreground" />
              </div>
            )}
          </motion.div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="rounded-2xl bg-secondary px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 mt-4">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Ask about your study material..."
          disabled={loading || !selectedContent}
          className="flex-1"
        />
        <Button variant="gradient" size="icon" onClick={sendMessage} disabled={loading || !input.trim() || !selectedContent}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
