import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function GoogleCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Connecting your Google account...");

  useEffect(() => {
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      setStatus("error");
      setMessage(`Google denied the request: ${error}`);
      return;
    }
    if (!code) {
      setStatus("error");
      setMessage("No authorization code returned from Google.");
      return;
    }

    const redirect_uri = `${window.location.origin}/google-callback`;
    supabase.functions
      .invoke("google-oauth", {
        body: { action: "exchange", code, redirect_uri },
      })
      .then(({ data, error: fnErr }) => {
        if (fnErr || data?.error) {
          setStatus("error");
          setMessage(data?.error || fnErr?.message || "Token exchange failed");
          return;
        }
        setStatus("success");
        setMessage("Google account connected!");
        toast.success("Google account connected");
        const returnTo = sessionStorage.getItem("google_oauth_return") || "/library";
        sessionStorage.removeItem("google_oauth_return");
        setTimeout(() => navigate(returnTo, { replace: true }), 800);
      });
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="rounded-2xl border border-border bg-card p-10 max-w-md w-full text-center space-y-4">
        {status === "loading" && <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />}
        {status === "success" && <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />}
        {status === "error" && <AlertCircle className="h-10 w-10 text-destructive mx-auto" />}
        <h1 className="font-heading text-xl font-semibold text-foreground">
          {status === "loading" ? "Connecting Google" : status === "success" ? "Connected!" : "Connection Failed"}
        </h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}