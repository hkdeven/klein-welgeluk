import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Types for database
export interface User {
  id: string;
  email: string;
  display_name: string;
  short_name: string;
  role: "owner" | "collaborator";
  avatar_url?: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  parent_id?: string;
  brief?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  page_id: string;
  filename: string;
  storage_path: string;
  file_size?: number;
  file_type?: string;
  caption?: string;
  uploaded_by: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_time?: string;
  end_date?: string;
  event_type: "meeting" | "delivery" | "deadline";
  description?: string;
  page_id?: string;
  created_by: string;
  created_at: string;
}

export interface Comment {
  id: string;
  page_id: string;
  parent_comment_id?: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}
