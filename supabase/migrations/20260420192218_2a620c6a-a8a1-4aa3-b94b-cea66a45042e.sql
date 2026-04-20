-- Enums
CREATE TYPE public.campaign_status AS ENUM ('draft', 'scheduled', 'active', 'paused', 'completed');
CREATE TYPE public.campaign_channel AS ENUM ('whatsapp', 'sms', 'email', 'multi');
CREATE TYPE public.broadcast_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Campaigns
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  channel public.campaign_channel NOT NULL DEFAULT 'whatsapp',
  status public.campaign_status NOT NULL DEFAULT 'draft',
  budget NUMERIC NOT NULL DEFAULT 0,
  audience_size INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  opened_count INTEGER NOT NULL DEFAULT 0,
  replied_count INTEGER NOT NULL DEFAULT 0,
  conversion_count INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and admins view campaigns" ON public.campaigns FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create their own campaigns" ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners and admins update campaigns" ON public.campaigns FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins delete campaigns" ON public.campaigns FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Broadcasts
CREATE TABLE public.broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience_tag public.lead_tag,
  status public.broadcast_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  read_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and admins view broadcasts" ON public.broadcasts FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create their own broadcasts" ON public.broadcasts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners and admins update broadcasts" ON public.broadcasts FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins delete broadcasts" ON public.broadcasts FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_broadcasts_updated_at BEFORE UPDATE ON public.broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tasks (Follow-ups)
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  notes TEXT,
  due_at TIMESTAMPTZ,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and admins view tasks" ON public.tasks FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create their own tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners and admins update tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins delete tasks" ON public.tasks FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_campaigns_owner ON public.campaigns(owner_id, status);
CREATE INDEX idx_broadcasts_owner ON public.broadcasts(owner_id, status);
CREATE INDEX idx_tasks_owner_status ON public.tasks(owner_id, status, due_at);