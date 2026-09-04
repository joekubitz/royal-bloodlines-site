import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        authenticated: false,
        userError: userError?.message ?? null,
      });
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, status, agency_id")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      email: user.email ?? null,
      role: roleData?.role ?? null,
      status: roleData?.status ?? null,
      agencyId: roleData?.agency_id ?? null,
      roleError: roleError?.message ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        authenticated: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
