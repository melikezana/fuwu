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
          full_name: string;
          phone: string;
          category_id: string | null;
          district_id: string | null;
          experience_years: number;
          availability: string | null;
          has_equipment: boolean;
          introduction: string | null;
          portfolio_url: string | null;
          profile_image_path: string | null;
          profile_image_url: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          phone: string;
          category_id?: string | null;
          district_id?: string | null;
          experience_years?: number;
          availability?: string | null;
          has_equipment?: boolean;
          introduction?: string | null;
          portfolio_url?: string | null;
          profile_image_path?: string | null;
          profile_image_url?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string;
          category_id?: string | null;
          district_id?: string | null;
          experience_years?: number;
          availability?: string | null;
          has_equipment?: boolean;
          introduction?: string | null;
          portfolio_url?: string | null;
          profile_image_path?: string | null;
          profile_image_url?: string | null;
          status?: string;
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
        ];
      };
      service_requests: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          district_id: string;
          address: string;
          urgency: string;
          preferred_date: string | null;
          preferred_time: string | null;
          description: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          district_id: string;
          address: string;
          urgency?: string;
          preferred_date?: string | null;
          preferred_time?: string | null;
          description?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          district_id?: string;
          address?: string;
          urgency?: string;
          preferred_date?: string | null;
          preferred_time?: string | null;
          description?: string | null;
          status?: string;
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
        };
        Insert: {
          id?: string;
          provider_id: string;
          user_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          user_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
