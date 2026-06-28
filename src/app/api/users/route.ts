import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
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
