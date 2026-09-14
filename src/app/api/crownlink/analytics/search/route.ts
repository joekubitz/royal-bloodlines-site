import { NextResponse } from "next/server";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export async function GET(
  request: Request
) {
  try {
    const supabase =
      await createClient();

    const adminSupabase =
      createAdminClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Not authenticated.",
        },
        {
          status: 401,
        }
      );
    }

    /*
      CREATOR ACCESS ONLY
    */

    const { data: role } =
      await supabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", user.id)
        .maybeSingle();

    if (
      !role ||
      role.role !== "creator" ||
      role.status !== "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Creator access required.",
        },
        {
          status: 403,
        }
      );
    }

    const url =
      new URL(request.url);

    const query =
      (
        url.searchParams.get(
          "q"
        ) ?? ""
      )
        .trim()
        .replace(/^@/, "");

    if (query.length < 2) {
      return NextResponse.json(
        {
          error:
            "Enter at least 2 characters.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      GET LATEST IMPORT

      This keeps creators from seeing
      duplicate copies of themselves
      from older Backstage uploads.
    */

    const {
      data: latestImport,
    } = await adminSupabase
      .from("backstage_imports")
      .select("id")
      .order("imported_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (!latestImport) {
      return NextResponse.json({
        creators: [],
      });
    }

    /*
      SEARCH ONLY LATEST DATA
    */

    const {
      data: creators,
      error,
    } = await adminSupabase
      .from(
        "backstage_creator_stats"
      )
      .select(`
        creator_id,
        username,
        manager,
        diamonds
      `)
      .eq(
        "import_id",
        latestImport.id
      )
      .not(
        "creator_id",
        "is",
        null
      )
      .ilike(
        "username",
        `%${query}%`
      )
      .order("diamonds", {
        ascending: false,
      })
      .limit(20);

    if (error) {
      console.error(
        "Analytics creator search error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Unable to search creators.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      creators:
        creators ?? [],
    });
  } catch (error) {
    console.error(
      "Analytics search route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected server error.",
      },
      {
        status: 500,
      }
    );
  }
}