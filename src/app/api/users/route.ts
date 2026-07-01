import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) } })
  : null;

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .neq("role", "guest")
      .order("display_name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      users: users || [],
      total: users?.length || 0,
    });
  } catch (error) {
    console.error("Users fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const { email, display_name, short_name, role } = await request.json();

    if (!email || !display_name || !short_name) {
      return NextResponse.json(
        { error: "email, display_name, and short_name are required" },
        { status: 400 }
      );
    }

    const { data: newUser, error } = await supabase
      .from("users")
      .insert([
        {
          email,
          display_name,
          short_name,
          role: role || "collaborator",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("User create error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
