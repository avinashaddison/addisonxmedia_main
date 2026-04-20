-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'agent');
CREATE TYPE public.lead_tag AS ENUM ('hot', 'warm', 'cold');
CREATE TYPE public.conversation_status AS ENUM ('open', 'pending', 'closed');
CREATE TYPE public.message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE public.message_status AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE public.deal_stage AS ENUM ('new', 'qualification', 'proposal', 'closing', 'won', 'lost');

-- =========================================
-- UTILITY: updated_at trigger function
-- =========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- USER ROLES (separate table — never on profiles!)
-- =========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer fn to check roles without recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- =========================================
-- CONTACTS (leads)
-- =========================================
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  source TEXT,
  tag public.lead_tag NOT NULL DEFAULT 'cold',
  score INT NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, phone)
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_contacts_owner ON public.contacts(owner_id);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- CONVERSATIONS
-- =========================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.conversation_status NOT NULL DEFAULT 'open',
  unread_count INT NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_conversations_owner ON public.conversations(owner_id);
CREATE INDEX idx_conversations_contact ON public.conversations(contact_id);
CREATE INDEX idx_conversations_last_msg ON public.conversations(last_message_at DESC);

CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- MESSAGES
-- =========================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  direction public.message_direction NOT NULL,
  body TEXT NOT NULL,
  media_url TEXT,
  status public.message_status NOT NULL DEFAULT 'sent',
  twilio_sid TEXT,
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);
CREATE INDEX idx_messages_owner ON public.messages(owner_id);

-- =========================================
-- DEALS
-- =========================================
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  stage public.deal_stage NOT NULL DEFAULT 'new',
  probability INT NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_deals_owner ON public.deals(owner_id);
CREATE INDEX idx_deals_contact ON public.deals(contact_id);

CREATE TRIGGER trg_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- AUTO-CREATE PROFILE + DEFAULT ROLE ON SIGNUP
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'agent');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- RLS POLICIES
-- =========================================

-- PROFILES: viewable by all authenticated users; editable only by self
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

-- USER_ROLES: users see their own; only admins can manage
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- CONTACTS: owner or admin
CREATE POLICY "Owners and admins view contacts"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create their own contacts"
  ON public.contacts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins update contacts"
  ON public.contacts FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners and admins delete contacts"
  ON public.contacts FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

-- CONVERSATIONS
CREATE POLICY "Owners and admins view conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = assigned_to OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create their own conversations"
  ON public.conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins update conversations"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = assigned_to OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners and admins delete conversations"
  ON public.conversations FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

-- MESSAGES
CREATE POLICY "Owners and admins view messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create their own messages"
  ON public.messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins update messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners and admins delete messages"
  ON public.messages FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

-- DEALS
CREATE POLICY "Owners and admins view deals"
  ON public.deals FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create their own deals"
  ON public.deals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins update deals"
  ON public.deals FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners and admins delete deals"
  ON public.deals FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));