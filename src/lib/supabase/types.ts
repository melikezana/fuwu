export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Replace this scaffold with generated Supabase CLI types after the database schema exists.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      service_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      districts: {
        Row: {
          id: string;
          name: string;
          slug: string;
          city: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          city?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          city?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      providers: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          category_id: string;
          district_id: string;
          phone: string;
          whatsapp: string | null;
          description: string | null;
          experience_years: number;
          average_price_min: number | null;
          average_price_max: number | null;
          rating: number;
          availability: string;
          working_hours: string;
          is_verified: boolean;
          phone_verified: boolean;
          identity_verified: boolean;
          last_active_at: string | null;
          response_time_minutes: number | null;
          profile_completion_score: number | null;
          profile_image_url: string | null;
          review_count: number;
          is_active: boolean;
          is_approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          category_id: string;
          district_id: string;
          phone: string;
          whatsapp?: string | null;
          description?: string | null;
          experience_years?: number;
          average_price_min?: number | null;
          average_price_max?: number | null;
          rating?: number;
          availability?: string;
          working_hours?: string;
          is_verified?: boolean;
          phone_verified?: boolean;
          identity_verified?: boolean;
          last_active_at?: string | null;
          response_time_minutes?: number | null;
          profile_completion_score?: number | null;
          profile_image_url?: string | null;
          review_count?: number;
          is_active?: boolean;
          is_approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          category_id?: string;
          district_id?: string;
          phone?: string;
          whatsapp?: string | null;
          description?: string | null;
          experience_years?: number;
          average_price_min?: number | null;
          average_price_max?: number | null;
          rating?: number;
          availability?: string;
          working_hours?: string;
          is_verified?: boolean;
          phone_verified?: boolean;
          identity_verified?: boolean;
          last_active_at?: string | null;
          response_time_minutes?: number | null;
          profile_completion_score?: number | null;
          profile_image_url?: string | null;
          review_count?: number;
          is_active?: boolean;
          is_approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "providers_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "providers_district_id_fkey";
            columns: ["district_id"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "providers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      provider_applications: {
        Row: {
          id: string;
          user_id: string | null;
          email: string | null;
          full_name: string;
          phone: string;
          category_id: string;
          district_id: string;
          experience_years: number;
          availability: string | null;
          has_equipment: boolean;
          introduction: string | null;
          portfolio_url: string | null;
          profile_image_path: string | null;
          profile_image_url: string | null;
          verification_document_path: string | null;
          verification_document_url: string | null;
          status: "pending" | "approved" | "rejected";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email?: string | null;
          full_name: string;
          phone: string;
          category_id: string;
          district_id: string;
          experience_years: number;
          availability: string | null;
          has_equipment: boolean;
          introduction: string | null;
          portfolio_url: string | null;
          profile_image_path?: string | null;
          profile_image_url?: string | null;
          verification_document_path?: string | null;
          verification_document_url?: string | null;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          email?: string | null;
          full_name?: string;
          phone?: string;
          category_id?: string;
          district_id?: string;
          experience_years?: number;
          availability?: string | null;
          has_equipment?: boolean;
          introduction?: string | null;
          portfolio_url?: string | null;
          profile_image_path?: string | null;
          profile_image_url?: string | null;
          verification_document_path?: string | null;
          verification_document_url?: string | null;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_applications_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "provider_applications_district_id_fkey";
            columns: ["district_id"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "provider_applications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      service_requests: {
        Row: {
          id: string;
          user_id: string | null;
          category_id: string;
          district_id: string;
          address: string;
          urgency: string;
          urgency_type: "standard" | "emergency" | null;
          budget: string | null;
          budget_tag: string | null;
          offered_price: number | null;
          payment_method: "cash" | "iban" | "online_soon" | null;
          payment_preference: "cash" | "iban" | "online_soon" | null;
          confirmation_code: string | null;
          estimated_arrival_text: string | null;
          approximate_location: string | null;
          emergency_status:
            | "pending"
            | "assigned"
            | "accepted"
            | "rejected"
            | "on_the_way"
            | "completed"
            | "cancelled"
            | null;
          preferred_date: string | null;
          preferred_time: string | null;
          description: string | null;
          status:
            | "pending"
            | "assigned"
            | "accepted"
            | "rejected"
            | "in_progress"
            | "cancelled"
            | "completed"
            | "yeni"
            | "inceleniyor"
            | "on_the_way"
            | "ustaya_yonlendirildi"
            | "tamamlandi"
            | "iptal"
            | "matched"
            | "open";
          assigned_provider_id: string | null;
          accepted_provider_id: string | null;
          accepted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          category_id: string;
          district_id: string;
          address: string;
          urgency?: string;
          urgency_type?: "standard" | "emergency" | null;
          budget?: string | null;
          budget_tag?: string | null;
          offered_price?: number | null;
          payment_method?: "cash" | "iban" | "online_soon" | null;
          payment_preference?: "cash" | "iban" | "online_soon" | null;
          confirmation_code?: string | null;
          estimated_arrival_text?: string | null;
          approximate_location?: string | null;
          emergency_status?:
            | "pending"
            | "assigned"
            | "accepted"
            | "rejected"
            | "on_the_way"
            | "completed"
            | "cancelled"
            | null;
          preferred_date?: string | null;
          preferred_time?: string | null;
          description?: string | null;
          status?:
            | "pending"
            | "assigned"
            | "accepted"
            | "rejected"
            | "in_progress"
            | "cancelled"
            | "completed"
            | "yeni"
            | "inceleniyor"
            | "on_the_way"
            | "ustaya_yonlendirildi"
            | "tamamlandi"
            | "iptal"
            | "matched"
            | "open";
          assigned_provider_id?: string | null;
          accepted_provider_id?: string | null;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          category_id?: string;
          district_id?: string;
          address?: string;
          urgency?: string;
          urgency_type?: "standard" | "emergency" | null;
          budget?: string | null;
          budget_tag?: string | null;
          offered_price?: number | null;
          payment_method?: "cash" | "iban" | "online_soon" | null;
          payment_preference?: "cash" | "iban" | "online_soon" | null;
          confirmation_code?: string | null;
          estimated_arrival_text?: string | null;
          approximate_location?: string | null;
          emergency_status?:
            | "pending"
            | "assigned"
            | "accepted"
            | "rejected"
            | "on_the_way"
            | "completed"
            | "cancelled"
            | null;
          preferred_date?: string | null;
          preferred_time?: string | null;
          description?: string | null;
          status?:
            | "pending"
            | "assigned"
            | "accepted"
            | "rejected"
            | "in_progress"
            | "cancelled"
            | "completed"
            | "yeni"
            | "inceleniyor"
            | "on_the_way"
            | "ustaya_yonlendirildi"
            | "tamamlandi"
            | "iptal"
            | "matched"
            | "open";
          assigned_provider_id?: string | null;
          accepted_provider_id?: string | null;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_requests_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_requests_district_id_fkey";
            columns: ["district_id"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_requests_assigned_provider_id_fkey";
            columns: ["assigned_provider_id"];
            isOneToOne: false;
            referencedRelation: "providers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_requests_accepted_provider_id_fkey";
            columns: ["accepted_provider_id"];
            isOneToOne: false;
            referencedRelation: "providers";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          request_id: string;
          amount: number | null;
          payment_method: "cash" | "iban" | "online_soon";
          status: "pending_confirmation" | "confirmed";
          confirmed_at: string | null;
          confirmed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          amount?: number | null;
          payment_method?: "cash" | "iban" | "online_soon";
          status?: "pending_confirmation" | "confirmed";
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          amount?: number | null;
          payment_method?: "cash" | "iban" | "online_soon";
          status?: "pending_confirmation" | "confirmed";
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: true;
            referencedRelation: "service_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_confirmed_by_fkey";
            columns: ["confirmed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          id: string;
          provider_id: string;
          user_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          user_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          user_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "providers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          recipient_user_id: string;
          actor_user_id: string | null;
          provider_id: string | null;
          request_id: string | null;
          entity_id: string | null;
          entity_type: "service_request" | "provider_application" | "provider";
          type: string;
          event: string;
          title: string;
          body: string;
          message: string;
          metadata: Json;
          is_read: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipient_user_id: string;
          actor_user_id?: string | null;
          provider_id?: string | null;
          request_id?: string | null;
          entity_id?: string | null;
          entity_type?: "service_request" | "provider_application" | "provider";
          type: string;
          event: string;
          title: string;
          body: string;
          message: string;
          metadata?: Json;
          is_read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          recipient_user_id?: string;
          actor_user_id?: string | null;
          provider_id?: string | null;
          request_id?: string | null;
          entity_id?: string | null;
          entity_type?: "service_request" | "provider_application" | "provider";
          type?: string;
          event?: string;
          title?: string;
          body?: string;
          message?: string;
          metadata?: Json;
          is_read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_recipient_user_id_fkey";
            columns: ["recipient_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "providers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "service_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limits: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          count: number;
          window_start: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          count?: number;
          window_start: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          count?: number;
          window_start?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rate_limits_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      bind_provider_applications_to_current_user: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      cleanup_old_audit_logs: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      notify_eligible_providers_for_request: {
        Args: {
          p_request_id: string;
        };
        Returns: number;
      };
      submit_provider_review: {
        Args: {
          p_comment: string;
          p_provider_id: string;
          p_rating: number;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
