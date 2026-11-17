/**
 * TypeScript database definitions for FoundDex.
 * Matches supabase/migrations/202611160001_initial_schema.sql
 * and supabase/migrations/202611170002_two_way_recovery_schema.sql.
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

export type ClaimStatus =
  | "submitted"
  | "under_review"
  | "more_info_requested"
  | "selected_for_verification"
  | "rejected"
  | "closed"
  | "withdrawn"
  | "spam";

export type FoundResponseStatus =
  | "submitted"
  | "under_review"
  | "selected_for_verification"
  | "closed"
  | "withdrawn";

export type RecoveryCaseStatus =
  | "submitted"
  | "under_review"
  | "more_info_requested"
  | "selected_for_verification"
  | "return_arranged"
  | "awaiting_owner_confirmation"
  | "completed"
  | "disputed"
  | "cancelled";

export type ReportDisputeKind = "block" | "abuse_report" | "dispute";
export type ReportDisputeStatus =
  | "open"
  | "under_review"
  | "resolved"
  | "dismissed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          trust_points: number;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          trust_points?: number;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          trust_points?: number;
          is_admin?: boolean;
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
          explanation: string;
          identifying_features: string;
          hidden_marks: string | null;
          private_notes: string | null;
          photo_paths: string[];
          document_paths: string[];
          status: ClaimStatus;
          reopened_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          claimant_id: string;
          explanation: string;
          identifying_features: string;
          hidden_marks?: string | null;
          private_notes?: string | null;
          photo_paths?: string[];
          document_paths?: string[];
          status?: ClaimStatus;
          reopened_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          claimant_id?: string;
          explanation?: string;
          identifying_features?: string;
          hidden_marks?: string | null;
          private_notes?: string | null;
          photo_paths?: string[];
          document_paths?: string[];
          status?: ClaimStatus;
          reopened_count?: number;
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
      found_responses: {
        Row: {
          id: string;
          item_id: string;
          finder_id: string;
          description: string;
          location_name: string;
          latitude: number | null;
          longitude: number | null;
          photo_paths: string[];
          status: FoundResponseStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          finder_id: string;
          description: string;
          location_name: string;
          latitude?: number | null;
          longitude?: number | null;
          photo_paths?: string[];
          status?: FoundResponseStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          finder_id?: string;
          description?: string;
          location_name?: string;
          latitude?: number | null;
          longitude?: number | null;
          photo_paths?: string[];
          status?: FoundResponseStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recovery_cases: {
        Row: {
          id: string;
          item_id: string;
          claim_id: string | null;
          found_response_id: string | null;
          finder_id: string;
          owner_id: string;
          status: RecoveryCaseStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          claim_id?: string | null;
          found_response_id?: string | null;
          finder_id: string;
          owner_id: string;
          status?: RecoveryCaseStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          claim_id?: string | null;
          found_response_id?: string | null;
          finder_id?: string;
          owner_id?: string;
          status?: RecoveryCaseStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          item_id: string;
          recovery_case_id: string | null;
          participant_a: string;
          participant_b: string;
          deleted_by_a_at: string | null;
          deleted_by_b_at: string | null;
          last_message_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          recovery_case_id?: string | null;
          participant_a: string;
          participant_b: string;
          deleted_by_a_at?: string | null;
          deleted_by_b_at?: string | null;
          last_message_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          recovery_case_id?: string | null;
          participant_a?: string;
          participant_b?: string;
          deleted_by_a_at?: string | null;
          deleted_by_b_at?: string | null;
          last_message_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          attachment_paths: string[];
          reply_to_id: string | null;
          delivered_at: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          attachment_paths?: string[];
          reply_to_id?: string | null;
          delivered_at?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          body?: string;
          attachment_paths?: string[];
          reply_to_id?: string | null;
          delivered_at?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      return_confirmations: {
        Row: {
          id: string;
          recovery_case_id: string;
          finder_confirmed_at: string | null;
          finder_note: string | null;
          owner_confirmed_at: string | null;
          owner_note: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recovery_case_id: string;
          finder_confirmed_at?: string | null;
          finder_note?: string | null;
          owner_confirmed_at?: string | null;
          owner_note?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          recovery_case_id?: string;
          finder_confirmed_at?: string | null;
          finder_note?: string | null;
          owner_confirmed_at?: string | null;
          owner_note?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          link_url: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          link_url?: string | null;
          read_at?: string | null;
          created_at?: string;
          };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string;
          link_url?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      reports_and_disputes: {
        Row: {
          id: string;
          reporter_id: string;
          reported_user_id: string | null;
          item_id: string | null;
          recovery_case_id: string | null;
          conversation_id: string | null;
          kind: ReportDisputeKind;
          reason: string;
          status: ReportDisputeStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_user_id?: string | null;
          item_id?: string | null;
          recovery_case_id?: string | null;
          conversation_id?: string | null;
          kind: ReportDisputeKind;
          reason: string;
          status?: ReportDisputeStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          reported_user_id?: string | null;
          item_id?: string | null;
          recovery_case_id?: string | null;
          conversation_id?: string | null;
          kind?: ReportDisputeKind;
          reason?: string;
          status?: ReportDisputeStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      recovery_audit_logs: {
        Row: {
          id: string;
          recovery_case_id: string;
          actor_id: string;
          action: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          recovery_case_id: string;
          actor_id: string;
          action: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          recovery_case_id?: string;
          actor_id?: string;
          action?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      finder_certificates: {
        Row: {
          id: string;
          recovery_case_id: string;
          finder_id: string;
          owner_id: string;
          item_id: string;
          certificate_code: string;
          points_awarded: number;
          issued_at: string;
        };
        Insert: {
          id?: string;
          recovery_case_id: string;
          finder_id: string;
          owner_id: string;
          item_id: string;
          certificate_code: string;
          points_awarded?: number;
          issued_at?: string;
        };
        Update: {
          id?: string;
          recovery_case_id?: string;
          finder_id?: string;
          owner_id?: string;
          item_id?: string;
          certificate_code?: string;
          points_awarded?: number;
          issued_at?: string;
        };
        Relationships: [];
      };
      moderation_audit_logs: {
        Row: {
          id: string;
          admin_id: string;
          target_type: string;
          target_id: string;
          action: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          target_type: string;
          target_id: string;
          action: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          target_type?: string;
          target_id?: string;
          action?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_item_claim_counts: {
        Args: { p_item_ids: string[] };
        Returns: { item_id: string; active_claim_count: number }[];
      };
    };
    Enums: Record<string, never>;
  };
}
