
CREATE TABLE public.content_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own content" ON public.content_sources
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own content" ON public.content_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content" ON public.content_sources
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content" ON public.content_sources
  FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_content_sources_updated_at
  BEFORE UPDATE ON public.content_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
