import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, numQuestions = 5 } = await req.json();
    if (!content) return new Response(JSON.stringify({ error: "Content is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert educator. Generate quiz questions from the provided content. Return ONLY valid JSON." },
          { role: "user", content: `Generate ${numQuestions} multiple-choice quiz questions from this content. Return JSON: {"questions": [{"question": "...", "options": {"A": "...", "B": "...", "C": "...", "D": "..."}, "correct": "A", "explanation": "..."}]}\n\nContent:\n${content.substring(0, 8000)}` }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_quiz",
            description: "Generate quiz questions",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: { type: "object", properties: { A: { type: "string" }, B: { type: "string" }, C: { type: "string" }, D: { type: "string" } }, required: ["A", "B", "C", "D"] },
                      correct: { type: "string", enum: ["A", "B", "C", "D"] },
                      explanation: { type: "string" }
                    },
                    required: ["question", "options", "correct", "explanation"]
                  }
                }
              },
              required: ["questions"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_quiz" } }
      }),
    });

    if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again later" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (response.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!response.ok) throw new Error("AI gateway error");

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Quiz error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
