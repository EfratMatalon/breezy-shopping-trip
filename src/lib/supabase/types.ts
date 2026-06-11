// Hand-written Database types matching supabase/migrations/00002_tables.sql.
// Replace with `supabase gen types typescript` output once a real project
// is linked (Phase 2 note — see docs/supabase-setup.md).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ShoppingItemStatus = "pending" | "purchased" | "unavailable";
export type ShoppingListStatus = "active" | "completed";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      households: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["households"]["Insert"]>;
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["household_members"]["Insert"]>;
      };
      products: {
        Row: {
          id: string;
          household_id: string | null;
          name: string;
          category: string;
          normalized_name: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id?: string | null;
          name: string;
          category: string;
          normalized_name: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      shopping_lists: {
        Row: {
          id: string;
          household_id: string;
          status: ShoppingListStatus;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          status: ShoppingListStatus;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shopping_lists"]["Insert"]>;
      };
      shopping_items: {
        Row: {
          id: string;
          list_id: string;
          product_id: string;
          quantity: number;
          status: ShoppingItemStatus;
          added_by: string | null;
          status_updated_by: string | null;
          status_updated_at: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          product_id: string;
          quantity: number;
          status?: ShoppingItemStatus;
          added_by?: string | null;
          status_updated_by?: string | null;
          status_updated_at?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shopping_items"]["Insert"]>;
      };
      recurring_products: {
        Row: {
          id: string;
          household_id: string;
          product_id: string;
          default_quantity: number;
          enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          product_id: string;
          default_quantity?: number;
          enabled?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["recurring_products"]["Insert"]>;
      };
      suggestion_dismissals: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          product_id: string;
          dismissed_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          product_id: string;
          dismissed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["suggestion_dismissals"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_household: {
        Args: { p_name: string };
        Returns: Json;
      };
      join_household_by_code: {
        Args: { p_code: string };
        Returns: Json;
      };
      regenerate_invite_code: {
        Args: { p_household_id: string };
        Returns: string;
      };
      leave_household: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      complete_shopping_trip: {
        Args: { p_household_id: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
  };
};
