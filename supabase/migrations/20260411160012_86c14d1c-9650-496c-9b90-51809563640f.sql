
-- reflection_entries
CREATE TABLE public.reflection_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT NOT NULL,
  writing_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reflection_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reflections"
  ON public.reflection_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own reflections"
  ON public.reflection_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reflections"
  ON public.reflection_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reflections"
  ON public.reflection_entries FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_reflection_entries_updated_at
  BEFORE UPDATE ON public.reflection_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- subscriptions
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'free'
    CONSTRAINT plan_type_valid CHECK (plan_type IN ('free', 'personal', 'family', 'community')),
  billing_cycle TEXT
    CONSTRAINT billing_cycle_valid CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'annual')),
  status TEXT NOT NULL DEFAULT 'active'
    CONSTRAINT status_valid CHECK (status IN ('active', 'cancelled', 'past_due')),
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- family_members
CREATE TABLE public.family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CONSTRAINT family_role_valid CHECK (role IN ('owner', 'member')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  joined_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_family_owner(_family_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = _family_id AND user_id = _user_id AND role = 'owner'
  );
$$;

CREATE POLICY "Family owners can view their family members"
  ON public.family_members FOR SELECT
  USING (auth.uid() = user_id OR public.is_family_owner(family_id, auth.uid()));
CREATE POLICY "Family owners can insert members"
  ON public.family_members FOR INSERT
  WITH CHECK (public.is_family_owner(family_id, auth.uid()));
CREATE POLICY "Family owners can delete members"
  ON public.family_members FOR DELETE
  USING (public.is_family_owner(family_id, auth.uid()));

-- community_members
CREATE TABLE public.community_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CONSTRAINT community_role_valid CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_community_admin(_community_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = _community_id AND user_id = _user_id AND role = 'admin'
  );
$$;

CREATE POLICY "Community admins can view all members"
  ON public.community_members FOR SELECT
  USING (auth.uid() = user_id OR public.is_community_admin(community_id, auth.uid()));
CREATE POLICY "Community admins can insert members"
  ON public.community_members FOR INSERT
  WITH CHECK (public.is_community_admin(community_id, auth.uid()));

-- usage_daily
CREATE TABLE public.usage_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  question_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

ALTER TABLE public.usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
  ON public.usage_daily FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own usage"
  ON public.usage_daily FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own usage"
  ON public.usage_daily FOR UPDATE USING (auth.uid() = user_id);

-- Create default free subscription on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'free', 'active');
  RETURN NEW;
END;
$$;
