export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          after_json: Json | null
          before_json: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          doc_type: string
          expiry_date: string | null
          file_url: string
          id: string
          owner_id: string
          owner_type: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          expiry_date?: string | null
          file_url: string
          id?: string
          owner_id: string
          owner_type: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          expiry_date?: string | null
          file_url?: string
          id?: string
          owner_id?: string
          owner_type?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          bank_account: string | null
          bank_agency: string | null
          bank_name: string | null
          cnh: string
          cnh_expiry: string
          cpf: string
          created_at: string
          id: string
          pix_key: string | null
          status: Database["public"]["Enums"]["driver_status"]
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          cnh: string
          cnh_expiry: string
          cpf: string
          created_at?: string
          id?: string
          pix_key?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          cnh?: string
          cnh_expiry?: string
          cpf?: string
          created_at?: string
          id?: string
          pix_key?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "drivers_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleets: {
        Row: {
          bank_account: string | null
          bank_agency: string | null
          bank_name: string | null
          cnpj: string
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          pix_key: string | null
          status: Database["public"]["Enums"]["fleet_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          cnpj: string
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          pix_key?: string | null
          status?: Database["public"]["Enums"]["fleet_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          cnpj?: string
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          pix_key?: string | null
          status?: Database["public"]["Enums"]["fleet_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          gateway: string
          gateway_fees: number | null
          gateway_payment_id: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string | null
          payload_json: Json | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          trip_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          gateway?: string
          gateway_fees?: number | null
          gateway_payment_id?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          payload_json?: Json | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          trip_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          gateway?: string
          gateway_fees?: number | null
          gateway_payment_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          payload_json?: Json | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          created_at: string
          driver_id: string | null
          fleet_id: string | null
          id: string
          method: string | null
          payment_date: string | null
          receipt_url: string | null
          status: Database["public"]["Enums"]["payout_status"]
          trip_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          driver_id?: string | null
          fleet_id?: string | null
          id?: string
          method?: string | null
          payment_date?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          trip_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          driver_id?: string | null
          fleet_id?: string | null
          id?: string
          method?: string | null
          payment_date?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          calculated_margin: number | null
          cancel_reason: string | null
          canceled_at: string | null
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          destination_text: string
          driver_id: string | null
          estimated_costs: number | null
          extras: string[] | null
          fleet_id: string | null
          id: string
          luggage: number
          notes: string | null
          origin_text: string
          passengers: number
          payout_driver: number
          pickup_datetime: string
          price_customer: number
          started_at: string | null
          status: Database["public"]["Enums"]["trip_status"]
          updated_at: string
        }
        Insert: {
          calculated_margin?: number | null
          cancel_reason?: string | null
          canceled_at?: string | null
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          destination_text: string
          driver_id?: string | null
          estimated_costs?: number | null
          extras?: string[] | null
          fleet_id?: string | null
          id?: string
          luggage?: number
          notes?: string | null
          origin_text: string
          passengers?: number
          payout_driver: number
          pickup_datetime: string
          price_customer: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          updated_at?: string
        }
        Update: {
          calculated_margin?: number | null
          cancel_reason?: string | null
          canceled_at?: string | null
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          destination_text?: string
          driver_id?: string | null
          estimated_costs?: number | null
          extras?: string[] | null
          fleet_id?: string | null
          id?: string
          luggage?: number
          notes?: string | null
          origin_text?: string
          passengers?: number
          payout_driver?: number
          pickup_datetime?: string
          price_customer?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["user_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          brand: string | null
          color: string | null
          created_at: string
          driver_id: string | null
          fleet_id: string | null
          id: string
          model: string | null
          plate: string
          seats: number
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          year: number | null
        }
        Insert: {
          brand?: string | null
          color?: string | null
          created_at?: string
          driver_id?: string | null
          fleet_id?: string | null
          id?: string
          model?: string | null
          plate: string
          seats: number
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          year?: number | null
        }
        Update: {
          brand?: string | null
          color?: string | null
          created_at?: string
          driver_id?: string | null
          fleet_id?: string | null
          id?: string
          model?: string | null
          plate?: string
          seats?: number
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_trip: { Args: { _trip_id: string }; Returns: Json }
      complete_trip: { Args: { _trip_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_staff: { Args: { _user_id: string }; Returns: boolean }
      start_trip: { Args: { _trip_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "ADMIN" | "STAFF" | "DRIVER" | "FLEET" | "CUSTOMER"
      document_status: "pending" | "approved" | "rejected" | "expired"
      driver_status: "pending" | "active" | "inactive" | "blocked"
      fleet_status: "pending" | "active" | "inactive" | "blocked"
      payment_method: "PIX" | "CARD"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      payout_status: "pending" | "paid"
      trip_status:
        | "DRAFT"
        | "PENDING_PAYMENT"
        | "PUBLISHED"
        | "CLAIMED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "CANCELED"
        | "REFUNDED"
      user_status: "active" | "inactive" | "blocked" | "pending"
      vehicle_status: "available" | "in_use" | "maintenance" | "inactive"
      vehicle_type: "sedan" | "van" | "suv" | "minibus"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["ADMIN", "STAFF", "DRIVER", "FLEET", "CUSTOMER"],
      document_status: ["pending", "approved", "rejected", "expired"],
      driver_status: ["pending", "active", "inactive", "blocked"],
      fleet_status: ["pending", "active", "inactive", "blocked"],
      payment_method: ["PIX", "CARD"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      payout_status: ["pending", "paid"],
      trip_status: [
        "DRAFT",
        "PENDING_PAYMENT",
        "PUBLISHED",
        "CLAIMED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELED",
        "REFUNDED",
      ],
      user_status: ["active", "inactive", "blocked", "pending"],
      vehicle_status: ["available", "in_use", "maintenance", "inactive"],
      vehicle_type: ["sedan", "van", "suv", "minibus"],
    },
  },
} as const
