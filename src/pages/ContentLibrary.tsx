import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FileText, Brain, BookOpen, MessageSquare, Loader2, Trash2, Globe, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface ContentSource {
  id: string;
  title: string;
  content: string;
  source_type: string;
  created_at: string;
}

export default function ContentLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contents, setContents] = useState<ContentSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [viewing, setViewing] = useState<ContentSource | null>(null);

  const fetchContents = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("content_sources")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load content");
    else setContents(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchContents(); }, [user]);

  const handleCreate = async () => {
    if (!user || !title.trim() || !content.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("content_sources").insert({
      user_id: user.id, title: title.trim(), content: content.trim(), source_type: "text",
    });
    if (error) toast.error("Failed to create content");
    else {
      toast.success("Content added!");
      setTitle(""); setContent(""); setOpen(false);
      fetchContents();
    }
    setCreating(false);
  };

  const handleScrape = async () => {
    if (!user || !url.trim()) return;
    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-url", {
        body: { url: url.trim() },
      });
      if (error) throw error;
      const { error: insertError } = await supabase.from("content_sources").insert({
        user_id: user.id, title: data.title || url, content: data.content, source_type: "url",
      });
      if (insertError) throw insertError;
      toast.success("URL content imported!");
      setUrl(""); setUrlOpen(false);
      fetchContents();
    } catch (e: any) {
      toast.error(e.message || "Failed to scrape URL");
    }
    setScraping(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("content_sources").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Deleted"); fetchContents(); }
  };

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.type !== "application/pdf" && !file.type.startsWith("text/")) {
      toast.error("Only PDF and text files are supported");
      return;
    }
    setUploading(true);
    try {
      let text: string;
      if (file.type === "application/pdf") {
        // Use edge function to parse PDF
        const formData = new FormData();
        formData.append("file", file);
        const { data, error } = await supabase.functions.invoke("parse-pdf", { body: formData });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        text = data.text;
      } else {
        text = await file.text();
      }
      const { error } = await supabase.from("content_sources").insert({
        user_id: user.id, title: file.name, content: text, source_type: file.type === "application/pdf" ? "pdf" : "file",
      });
      if (error) throw error;
      toast.success("File uploaded!");
      fetchContents();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
    }
    setUploading(false);
    // Reset input
    e.target.value = "";
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Content Library</h1>
          <p className="text-muted-foreground mt-1">Manage your study materials</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={urlOpen} onOpenChange={setUrlOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Globe className="h-4 w-4 mr-2" />Import URL</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Import from URL</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>URL</Label><Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></div>
                <Button variant="gradient" onClick={handleScrape} disabled={scraping} className="w-full">
                  {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <label>
            <input type="file" accept=".pdf,.txt,.md" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            <Button variant="outline" size="sm" asChild disabled={uploading}>
              <span>{uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}{uploading ? "Uploading..." : "Upload File"}</span>
            </Button>
          </label>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" size="sm"><Plus className="h-4 w-4 mr-2" />Add Content</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Study Content</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Biology Chapter 3" /></div>
                <div><Label>Content</Label><Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Paste your study material..." rows={8} /></div>
                <Button variant="gradient" onClick={handleCreate} disabled={creating} className="w-full">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Content"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : contents.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="font-heading text-lg">No content yet</p>
          <p className="text-sm mt-1">Add your first study material to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {contents.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow hover:border-primary/30 group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-semibold text-foreground truncate">{c.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{c.source_type}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.content.substring(0, 200)}...</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(c.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ml-4">
                  <Button variant="ghost" size="icon" onClick={() => setViewing(c)} title="View Content"><Eye className="h-4 w-4" strokeWidth={1.75} /></Button>
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/quiz?contentId=${c.id}`)} title="Generate Quiz"><Brain className="h-4 w-4" strokeWidth={1.75} /></Button>
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/flashcards?contentId=${c.id}`)} title="Generate Flashcards"><BookOpen className="h-4 w-4" strokeWidth={1.75} /></Button>
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/chat?contentId=${c.id}`)} title="Chat about this"><MessageSquare className="h-4 w-4" strokeWidth={1.75} /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} title="Delete" className="hover:text-destructive"><Trash2 className="h-4 w-4" strokeWidth={1.75} /></Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              <span className="truncate">{viewing?.title}</span>
              {viewing && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize shrink-0">
                  {viewing.source_type}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed">
              {viewing?.content}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
