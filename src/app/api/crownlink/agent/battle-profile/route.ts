import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .single();

    if (
      !userRole ||
      userRole.role !== "agent" ||
      userRole.status !== "active"
    ) {
      return NextResponse.json(
        { error: "Agent access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const diamondLevel = Number(body.diamondLevel);

    if (
      !Number.isInteger(diamondLevel) ||
      diamondLevel < 0
    ) {
      return NextResponse.json(
        { error: "Enter a valid diamond amount." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { error: updateError } =
      await adminSupabase
        .from("crownlink_profiles")
        .update({
          diamond_level: diamondLevel,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      diamondLevel,
    });
  } catch (error) {
    console.error(
      "CROWN LINK AGENT BATTLE PROFILE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error.",
      },
      { status: 500 }
    );
  }
}
