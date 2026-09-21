import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/supabase/admin";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  try {
    // Get the logged-in user's access token from the app.
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const accessToken = authorization.slice(7).trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const adminSupabase = createAdminClient();

    // Verify the access token with Supabase.
    // This prevents somebody from supplying another user's ID
    // and deleting that person's account.
    const {
      data: { user },
      error: userError,
    } = await adminSupabase.auth.getUser(accessToken);

    if (userError || !user) {
      console.error("DELETE ACCOUNT AUTH ERROR:", userError);

      return NextResponse.json(
        {
          success: false,
          error: "Your session is invalid or has expired. Please sign in again.",
        },
        { status: 401 }
      );
    }

    const userID = user.id;

    // Delete the authenticated Supabase Auth account.
    // Related database records configured with ON DELETE CASCADE
    // will also be removed automatically.
    const { error: deleteError } =
      await adminSupabase.auth.admin.deleteUser(userID);

    if (deleteError) {
      console.error("DELETE ACCOUNT ERROR:", deleteError);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to delete your account.",
        },
        { status: 500 }
      );
    }

    console.log("ACCOUNT DELETED:", userID);

    return NextResponse.json({
      success: true,
      message: "Your account has been permanently deleted.",
    });
  } catch (error) {
    console.error("DELETE ACCOUNT ROUTE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while deleting your account.",
      },
      { status: 500 }
    );
  }
}
