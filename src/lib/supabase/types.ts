/**
 * Placeholder database type definitions for FoundDex.
 * In Phase 2, this file will be replaced with types generated directly
 * from the Supabase PostgreSQL schema.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

