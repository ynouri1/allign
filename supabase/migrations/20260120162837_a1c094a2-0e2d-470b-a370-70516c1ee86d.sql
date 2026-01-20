
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'practitioner', 'patient');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create patients table (extends profile with patient-specific data)
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  treatment_start DATE,
  total_aligners INTEGER DEFAULT 0,
  current_aligner INTEGER DEFAULT 1,
  next_change_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create practitioners table (extends profile with practitioner-specific data)
CREATE TABLE public.practitioners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  specialty TEXT,
  license_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create practitioner_patients junction table
CREATE TABLE public.practitioner_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (practitioner_id, patient_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_patients ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's profile id
CREATE OR REPLACE FUNCTION public.get_profile_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Practitioners can view their patients profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'practitioner') AND
    EXISTS (
      SELECT 1 FROM public.practitioner_patients pp
      JOIN public.practitioners pr ON pr.id = pp.practitioner_id
      JOIN public.patients pa ON pa.id = pp.patient_id
      WHERE pr.profile_id = public.get_profile_id(auth.uid())
        AND pa.profile_id = profiles.id
    )
  );

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Patients policies
CREATE POLICY "Admins can manage patients"
  ON public.patients FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Practitioners can view their patients"
  ON public.patients FOR SELECT
  USING (
    public.has_role(auth.uid(), 'practitioner') AND
    EXISTS (
      SELECT 1 FROM public.practitioner_patients pp
      JOIN public.practitioners pr ON pr.id = pp.practitioner_id
      WHERE pr.profile_id = public.get_profile_id(auth.uid())
        AND pp.patient_id = patients.id
    )
  );

CREATE POLICY "Patients can view own data"
  ON public.patients FOR SELECT
  USING (profile_id = public.get_profile_id(auth.uid()));

-- Practitioners policies
CREATE POLICY "Admins can manage practitioners"
  ON public.practitioners FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Practitioners can view own data"
  ON public.practitioners FOR SELECT
  USING (profile_id = public.get_profile_id(auth.uid()));

-- Practitioner_patients policies
CREATE POLICY "Admins can manage assignments"
  ON public.practitioner_patients FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Practitioners can view own assignments"
  ON public.practitioner_patients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.practitioners pr
      WHERE pr.id = practitioner_patients.practitioner_id
        AND pr.profile_id = public.get_profile_id(auth.uid())
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_practitioners_updated_at
  BEFORE UPDATE ON public.practitioners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
