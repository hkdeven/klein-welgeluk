import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { passcode } = await request.json();

    if (!passcode) {
      return NextResponse.json(
        { error: "Invalid passcode" },
        { status: 401 }
      );
    }

    // In production, compare with hashed passcode
    // For now, allow any non-empty passcode as demo
    if (passcode.length < 4) {
      return NextResponse.json(
        { error: "Invalid passcode" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      role: "guest",
      token: Buffer.from(JSON.stringify({ role: "guest" })).toString("base64"),
    });

    response.cookies.set("guest_session", "valid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
