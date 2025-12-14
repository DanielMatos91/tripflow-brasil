// Application types derived from database schema
export type AppRole = 'ADMIN' | 'STAFF' | 'DRIVER' | 'FLEET' | 'CUSTOMER';
export type UserStatus = 'active' | 'inactive' | 'blocked' | 'pending';
export type DriverStatus = 'pending' | 'active' | 'inactive' | 'blocked';
export type FleetStatus = 'pending' | 'active' | 'inactive' | 'blocked';
export type VehicleType = 'sedan' | 'van' | 'suv' | 'minibus';
export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | 'inactive';
export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type TripStatus = 'DRAFT' | 'PENDING_PAYMENT' | 'PUBLISHED' | 'CLAIMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'REFUNDED';
export type PaymentMethod = 'PIX' | 'CARD';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PayoutStatus = 'pending' | 'paid';

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  status: UserStatus;
  created_at: string;
}

export interface Driver {
  id: string;
  user_id: string;
  cpf: string;
  cnh: string;
  cnh_expiry: string;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  pix_key?: string;
  verified: boolean;
  status: DriverStatus;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Fleet {
  id: string;
  user_id: string;
  company_name: string;
  cnpj: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  pix_key?: string;
  status: FleetStatus;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Vehicle {
  id: string;
  driver_id?: string;
  fleet_id?: string;
  vehicle_type: VehicleType;
  seats: number;
  plate: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
  driver?: Driver;
  fleet?: Fleet;
}

export interface Document {
  id: string;
  owner_type: 'driver' | 'fleet' | 'vehicle';
  owner_id: string;
  doc_type: string;
  file_url: string;
  expiry_date?: string;
  status: DocumentStatus;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  origin_text: string;
  destination_text: string;
  pickup_datetime: string;
  passengers: number;
  luggage: number;
  extras?: string[];
  notes?: string;
  price_customer: number;
  payout_driver: number;
  estimated_costs?: number;
  calculated_margin?: number;
  status: TripStatus;
  driver_id?: string;
  fleet_id?: string;
  claimed_at?: string;
  started_at?: string;
  completed_at?: string;
  canceled_at?: string;
  cancel_reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  driver?: Driver;
  fleet?: Fleet;
  payment?: Payment;
}

export interface Payment {
  id: string;
  trip_id: string;
  gateway: string;
  method: PaymentMethod;
  amount: number;
  gateway_fees?: number;
  status: PaymentStatus;
  gateway_payment_id?: string;
  payload_json?: unknown;
  created_at: string;
  paid_at?: string;
  refunded_at?: string;
  trip?: Trip;
}

export interface Payout {
  id: string;
  trip_id: string;
  driver_id?: string;
  fleet_id?: string;
  amount: number;
  status: PayoutStatus;
  payment_date?: string;
  method?: string;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
  trip?: Trip;
  driver?: Driver;
  fleet?: Fleet;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  before_json?: Record<string, unknown>;
  after_json?: Record<string, unknown>;
  actor_user_id?: string;
  created_at: string;
  actor?: Profile;
}
