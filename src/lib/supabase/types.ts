/**
 * TypeScript database definitions for FoundDex (Phase 2).
 * Matches supabase/migrations/202611160001_initial_schema.sql.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ReportType = "lost" | "found";
export type ItemStatus = "open" | "matched" | "returned" | "closed";
export type ClaimStatus = "pending" | "approved" | "rejected" | "withdrawn";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          trust_points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          trust_points?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          trust_points?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          user_id: string;
          report_type: ReportType;
          status: ItemStatus;
          title: string;
          category: string;
          description: string;
          location_name: string;
          latitude: number | null;
          longitude: number | null;
          occurred_at: string | null;
          photo_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          report_type: ReportType;
          status?: ItemStatus;
          title: string;
          category: string;
          description: string;
          location_name: string;
          latitude?: number | null;
          longitude?: number | null;
          occurred_at?: string | null;
          photo_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          report_type?: ReportType;
          status?: ItemStatus;
          title?: string;
          category?: string;
          description?: string;
          location_name?: string;
          latitude?: number | null;
          longitude?: number | null;
          occurred_at?: string | null;
          photo_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      claims: {
        Row: {
          id: string;
          item_id: string;
          claimant_id: string;
          verification_note: string;
          status: ClaimStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          claimant_id: string;
          verification_note: string;
          status?: ClaimStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          claimant_id?: string;
          verification_note?: string;
          status?: ClaimStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "claims_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claims_claimant_id_fkey";
            columns: ["claimant_id"];
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
  };
}
