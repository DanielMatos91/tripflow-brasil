-- Enum types for the application
CREATE TYPE public.app_role AS ENUM ('ADMIN', 'STAFF', 'DRIVER', 'FLEET', 'CUSTOMER');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'blocked', 'pending');
CREATE TYPE public.driver_status AS ENUM ('pending', 'active', 'inactive', 'blocked');
CREATE TYPE public.fleet_status AS ENUM ('pending', 'active', 'inactive', 'blocked');
CREATE TYPE public.vehicle_type AS ENUM ('sedan', 'van', 'suv', 'minibus');
CREATE TYPE public.vehicle_status AS ENUM ('available', 'in_use', 'maintenance', 'inactive');
CREATE TYPE public.document_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
CREATE TYPE public.trip_status AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'PUBLISHED', 'CLAIMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'REFUNDED');
CREATE TYPE public.payment_method AS ENUM ('PIX', 'CARD');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE public.payout_status AS ENUM ('pending', 'paid');

-- Profiles table (public user data)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (RBAC)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  status user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Security definer function for role checking
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
      AND status = 'active'
  )
$$;

-- Check if user is admin or staff
CREATE OR REPLACE FUNCTION public.is_admin_or_staff(_user_id UUID)
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
      AND role IN ('ADMIN', 'STAFF')
      AND status = 'active'
  )
$$;

-- Drivers table
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cpf TEXT NOT NULL UNIQUE,
  cnh TEXT NOT NULL,
  cnh_expiry DATE NOT NULL,
  bank_name TEXT,
  bank_agency TEXT,
  bank_account TEXT,
  pix_key TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  status driver_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fleets table
CREATE TABLE public.fleets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  bank_name TEXT,
  bank_agency TEXT,
  bank_account TEXT,
  pix_key TEXT,
  status fleet_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  fleet_id UUID REFERENCES public.fleets(id) ON DELETE SET NULL,
  vehicle_type vehicle_type NOT NULL,
  seats INTEGER NOT NULL,
  plate TEXT NOT NULL UNIQUE,
  brand TEXT,
  model TEXT,
  year INTEGER,
  color TEXT,
  status vehicle_status NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('driver', 'fleet', 'vehicle')),
  owner_id UUID NOT NULL,
  doc_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  expiry_date DATE,
  status document_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trips table
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  origin_text TEXT NOT NULL,
  destination_text TEXT NOT NULL,
  pickup_datetime TIMESTAMPTZ NOT NULL,
  passengers INTEGER NOT NULL DEFAULT 1,
  luggage INTEGER NOT NULL DEFAULT 0,
  extras TEXT[],
  notes TEXT,
  price_customer DECIMAL(10,2) NOT NULL,
  payout_driver DECIMAL(10,2) NOT NULL,
  estimated_costs DECIMAL(10,2),
  calculated_margin DECIMAL(10,2),
  status trip_status NOT NULL DEFAULT 'DRAFT',
  driver_id UUID REFERENCES public.drivers(id),
  fleet_id UUID REFERENCES public.fleets(id),
  claimed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  gateway TEXT NOT NULL DEFAULT 'stripe',
  method payment_method NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  gateway_fees DECIMAL(10,2),
  status payment_status NOT NULL DEFAULT 'pending',
  gateway_payment_id TEXT,
  payload_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);

-- Payouts table
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id),
  driver_id UUID REFERENCES public.drivers(id),
  fleet_id UUID REFERENCES public.fleets(id),
  amount DECIMAL(10,2) NOT NULL,
  status payout_status NOT NULL DEFAULT 'pending',
  payment_date TIMESTAMPTZ,
  method TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  actor_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin/Staff can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Admin can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for drivers
CREATE POLICY "Admin/Staff can manage drivers" ON public.drivers
  FOR ALL USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Drivers can view their own data" ON public.drivers
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for fleets
CREATE POLICY "Admin/Staff can manage fleets" ON public.fleets
  FOR ALL USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Fleets can view their own data" ON public.fleets
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for vehicles
CREATE POLICY "Admin/Staff can manage vehicles" ON public.vehicles
  FOR ALL USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Drivers can view their vehicles" ON public.vehicles
  FOR SELECT USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

-- RLS Policies for documents
CREATE POLICY "Admin/Staff can manage documents" ON public.documents
  FOR ALL USING (public.is_admin_or_staff(auth.uid()));

-- RLS Policies for trips
CREATE POLICY "Admin/Staff can manage trips" ON public.trips
  FOR ALL USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Drivers can view published trips" ON public.trips
  FOR SELECT USING (
    status = 'PUBLISHED' AND 
    EXISTS (SELECT 1 FROM public.drivers WHERE user_id = auth.uid() AND verified = true)
  );

CREATE POLICY "Drivers can view their claimed trips" ON public.trips
  FOR SELECT USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

-- RLS Policies for payments
CREATE POLICY "Admin/Staff can manage payments" ON public.payments
  FOR ALL USING (public.is_admin_or_staff(auth.uid()));

-- RLS Policies for payouts
CREATE POLICY "Admin/Staff can manage payouts" ON public.payouts
  FOR ALL USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Drivers can view their payouts" ON public.payouts
  FOR SELECT USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

-- RLS Policies for audit_logs
CREATE POLICY "Admin can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'));

-- Trigger for updating updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fleets_updated_at BEFORE UPDATE ON public.fleets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes for performance
CREATE INDEX idx_trips_status ON public.trips(status);
CREATE INDEX idx_trips_pickup_datetime ON public.trips(pickup_datetime);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_trip_id ON public.payments(trip_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_owner ON public.documents(owner_type, owner_id);
CREATE INDEX idx_drivers_verified ON public.drivers(verified);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);