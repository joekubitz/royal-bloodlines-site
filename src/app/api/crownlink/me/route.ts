import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    const accessToken = authorization
      .slice("Bearer ".length)
      .trim();

    if (!accessToken) {
      return null;
    }

    const adminSupabase = createAdminClient();

    const {
      data: { user },
      error,
    } = await adminSupabase.auth.getUser(accessToken);

    if (error || !user) {
      return null;
    }

    return user;
  }

  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated.",
        },
        { status: 401 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: userRole, error: roleError } =
      await adminSupabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", user.id)
        .maybeSingle();

    if (roleError) {
      console.error(
        "ROLE LOOKUP ERROR:",
        roleError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to load account role.",
        },
        { status: 500 }
      );
    }

    if (!userRole) {
      return NextResponse.json(
        {
          success: false,
          error: "Account role not found.",
        },
        { status: 404 }
      );
    }

    if (userRole.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          error: "This account is not active.",
          role: userRole.role,
          status: userRole.status,
        },
        { status: 403 }
      );
    }

    if (
      userRole.role !== "creator" &&
      userRole.role !== "agent" &&
      userRole.role !== "admin"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported account role.",
          role: userRole.role,
          status: userRole.status,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user_id: user.id,
      email: user.email ?? null,
      role: userRole.role,
      status: userRole.status,
    });
  } catch (error) {
    console.error(
      "ME API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load account.",
      },
      { status: 500 }
    );
  }
}
