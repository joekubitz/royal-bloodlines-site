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
        { error: "Not authenticated." },
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
      userRole.role !== "admin" ||
      userRole.status !== "active"
    ) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const password = String(body.password || "");
    const agencyName = String(body.agencyName || "").trim();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        {
          error: "Temporary password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    if (!agencyName) {
      return NextResponse.json(
        { error: "Agency is required." },
        { status: 400 }
      );
    }

    const { data: agency, error: agencyError } = await supabase
      .from("crownlink_agencies")
      .select("id, name, status")
      .eq("name", agencyName)
      .single();

    if (agencyError || !agency || agency.status !== "active") {
      return NextResponse.json(
        { error: "That agency is not active." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const {
      data: createdUser,
      error: createUserError,
    } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createUserError || !createdUser.user) {
      return NextResponse.json(
        {
          error:
            createUserError?.message ||
            "Could not create creator account.",
        },
        { status: 400 }
      );
    }

    const newUserId = createdUser.user.id;

    const { error: roleInsertError } = await adminSupabase
      .from("user_roles")
      .insert({
        user_id: newUserId,
        role: "creator",
        status: "active",
        agency_id: agency.id,
      });

    if (roleInsertError) {
      await adminSupabase.auth.admin.deleteUser(newUserId);

      return NextResponse.json(
        { error: roleInsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: newUserId,
      email,
      agencyName: agency.name,
      agencyId: agency.id,
    });
  } catch (error) {
    console.error("CREATE CROWN LINK CREATOR ERROR:", error);

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}