
-- Track study sessions for real analytics
CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('quiz', 'flashcard', 'chat', 'study')),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  score NUMERIC,
  items_count INTEGER DEFAULT 0,
  content_source_id UUID REFERENCES public.content_sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
ON public.study_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
ON public.study_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_study_sessions_user ON public.study_sessions(user_id);
CREATE INDEX idx_study_sessions_type ON public.study_sessions(session_type);
