import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";

type ImportCreatorRow = {
  username: string;
  manager?: string | null;
  days_since_joining?: number | null;
  diamonds?: number | null;
  live_days?: number | null;
  live_duration?: number | null;
  matches?: number | null;
  diamonds_from_matches?: number | null;
  last_month_diamonds?: number | null;
  last_month_days?: number | null;
  last_month_hours?: number | null;
};

function cleanNumber(
  value: unknown
) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient();

    /*
      AUTH
    */

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
      ADMIN CHECK
    */

    const { data: userRole } =
      await supabase
        .from("user_roles")
        .select("role, status")
        .eq(
          "user_id",
          user.id
        )
        .single();

    if (
      !userRole ||
      userRole.role !==
        "admin" ||
      userRole.status !==
        "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Admin access required.",
        },
        {
          status: 403,
        }
      );
    }

    /*
      READ BODY
    */

    const body =
      await request.json();

    const rows =
      Array.isArray(body.rows)
        ? (body.rows as ImportCreatorRow[])
        : [];

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "No creator rows were provided.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      SHARED IMPORT TIME

      Every creator in this upload
      receives the same imported_at
      value.
    */

    const importedAt =
      new Date().toISOString();

    /*
      CLEAN ROWS
    */

    const cleanedRows = rows
      .map((row) => {
        const username = String(
          row.username ?? ""
        )
          .trim()
          .replace(/^@/, "");

        return {
          username,

          manager:
            String(
              row.manager ?? ""
            ).trim() || null,

          days_since_joining:
            Math.round(
              cleanNumber(
                row.days_since_joining
              )
            ),

          diamonds:
            Math.round(
              cleanNumber(
                row.diamonds
              )
            ),

          live_days:
            cleanNumber(
              row.live_days
            ),

          live_duration:
            cleanNumber(
              row.live_duration
            ),

          matches:
            Math.round(
              cleanNumber(
                row.matches
              )
            ),

          diamonds_from_matches:
            Math.round(
              cleanNumber(
                row.diamonds_from_matches
              )
            ),

          last_month_diamonds:
            Math.round(
              cleanNumber(
                row.last_month_diamonds
              )
            ),

          last_month_days:
            cleanNumber(
              row.last_month_days
            ),

          last_month_hours:
            cleanNumber(
              row.last_month_hours
            ),

          imported_at:
            importedAt,
        };
      })
      .filter(
        (row) =>
          row.username.length > 0
      );

    if (
      cleanedRows.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No valid creators were found.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      INSERT IN BATCHES

      Keeps large Backstage
      reports reliable.
    */

    const batchSize = 250;

    let importedCount = 0;

    for (
      let i = 0;
      i < cleanedRows.length;
      i += batchSize
    ) {
      const batch =
        cleanedRows.slice(
          i,
          i + batchSize
        );

      const { error } =
        await supabase
          .from(
            "backstage_creator_stats"
          )
          .insert(batch);

      if (error) {
        console.error(
          "Backstage import error:",
          error
        );

        return NextResponse.json(
          {
            error:
              error.message,
          },
          {
            status: 500,
          }
        );
      }

      importedCount +=
        batch.length;
    }

    return NextResponse.json({
      success: true,
      count: importedCount,
    });
  } catch (error) {
    console.error(
      "Backstage import route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected import error.",
      },
      {
        status: 500,
      }
    );
  }
}