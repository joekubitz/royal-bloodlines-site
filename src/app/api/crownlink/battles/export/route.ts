import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required." },
        { status: 400 }
      );
    }

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

    const adminSupabase = createAdminClient();

    const { data: userRole, error: roleError } =
      await adminSupabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", user.id)
        .maybeSingle();

    if (roleError) {
      console.error(
        "CROWN LINK BATTLE EXPORT ROLE ERROR:",
        roleError
      );

      return NextResponse.json(
        { error: "Could not verify admin access." },
        { status: 500 }
      );
    }

    if (
      !userRole ||
      userRole.role !== "admin" ||
      userRole.status !== "active"
    ) {
      return NextResponse.json(
        {
          error: "Admin access required.",
          detectedRole: userRole?.role ?? null,
          detectedStatus: userRole?.status ?? null,
        },
        { status: 403 }
      );
    }

    const { data: matches, error: matchesError } =
      await adminSupabase
        .from("crownlink_matches")
        .select(`
          id,
          event_id,
          creator_one_id,
          creator_two_id,
          status,
          creator_one_score,
          creator_two_score,
          approved_at
        `)
        .eq("status", "approved")
        .eq("event_id", eventId)
        .order("approved_at", { ascending: true });

    if (matchesError) {
      console.error(
        "CROWN LINK BATTLE EXPORT MATCH ERROR:",
        matchesError
      );

      return NextResponse.json(
        { error: "Could not load battles for export." },
        { status: 500 }
      );
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json(
        { error: "No approved battles were found for this event." },
        { status: 400 }
      );
    }

    const creatorIds = [
      ...new Set(
        matches.flatMap((match) => [
          match.creator_one_id,
          match.creator_two_id,
        ])
      ),
    ];

    const { data: events, error: eventsError } =
      await adminSupabase
        .from("crownlink_events")
        .select("id, name, event_date, event_time")
        .eq("id", eventId);

    if (eventsError) {
      console.error(
        "CROWN LINK BATTLE EXPORT EVENT ERROR:",
        eventsError
      );

      return NextResponse.json(
        { error: "Could not load event information." },
        { status: 500 }
      );
    }

    const selectedEvent = events?.find(
      (event) => event.id === eventId
    );

    if (!selectedEvent) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 }
      );
    }

    const { data: creatorProfiles, error: profilesError } =
      await adminSupabase
        .from("crownlink_profiles")
        .select(`
          user_id,
          display_name,
          tiktok_username,
          agent_user_id
        `)
        .in("user_id", creatorIds);

    if (profilesError) {
      console.error(
        "CROWN LINK BATTLE EXPORT PROFILE ERROR:",
        profilesError
      );

      return NextResponse.json(
        { error: "Could not load creator information." },
        { status: 500 }
      );
    }

    const agentIds = [
      ...new Set(
        (creatorProfiles ?? [])
          .map((profile) => profile.agent_user_id)
          .filter(
            (agentId): agentId is string => Boolean(agentId)
          )
      ),
    ];

    const { data: agentProfiles, error: agentsError } =
      agentIds.length > 0
        ? await adminSupabase
            .from("crownlink_profiles")
            .select("user_id, display_name")
            .in("user_id", agentIds)
        : { data: [], error: null };

    if (agentsError) {
      console.error(
        "CROWN LINK BATTLE EXPORT AGENT ERROR:",
        agentsError
      );

      return NextResponse.json(
        { error: "Could not load agent information." },
        { status: 500 }
      );
    }

    function getProfile(userId: string) {
      return creatorProfiles?.find(
        (profile) => profile.user_id === userId
      );
    }

    function getCreatorName(userId: string) {
      const profile = getProfile(userId);

      return (
        profile?.display_name?.trim() ||
        profile?.tiktok_username?.trim() ||
        "Creator"
      );
    }

    function getAgentName(userId: string) {
      const profile = getProfile(userId);

      if (!profile?.agent_user_id) {
        return "";
      }

      const agent = agentProfiles?.find(
        (item) => item.user_id === profile.agent_user_id
      );

      return agent?.display_name?.trim() || "";
    }

    function formatDateTime(
      dateString: string,
      timeString: string
    ) {
      const date = new Date(`${dateString}T12:00:00`);

      const formattedDate = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const [hourString, minuteString] = timeString.split(":");

      let hour = Number(hourString);
      const minute = minuteString || "00";
      const suffix = hour >= 12 ? "PM" : "AM";

      hour = hour % 12 || 12;

      return `${formattedDate} ${hour}:${minute} ${suffix}`;
    }

    const rows = matches.map((match) => ({
      "Battle ID": match.id,
      "Date / Time": formatDateTime(
        selectedEvent.event_date,
        selectedEvent.event_time
      ),
      Creator: getCreatorName(match.creator_one_id),
      Agent: getAgentName(match.creator_one_id),
      Score:
        match.creator_one_score !== null
          ? Number(match.creator_one_score)
          : "",
      VS: "VS",
      Opponent: getCreatorName(match.creator_two_id),
      "Opponent Agent": getAgentName(match.creator_two_id),
      "Opponent Score":
        match.creator_two_score !== null
          ? Number(match.creator_two_score)
          : "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: [
        "Battle ID",
        "Date / Time",
        "Creator",
        "Agent",
        "Score",
        "VS",
        "Opponent",
        "Opponent Agent",
        "Opponent Score",
      ],
    });

    worksheet["!cols"] = [
      { hidden: true, wch: 38 },
      { wch: 24 },
      { wch: 24 },
      { wch: 20 },
      { wch: 14 },
      { wch: 7 },
      { wch: 24 },
      { wch: 20 },
      { wch: 16 },
    ];

    worksheet["!autofilter"] = {
      ref: `A1:I${rows.length + 1}`,
    };

    worksheet["!freeze"] = {
      xSplit: 0,
      ySplit: 1,
      topLeftCell: "A2",
      activePane: "bottomLeft",
      state: "frozen",
    } as any;

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Battle Schedule"
    );

    const workbookBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const today = new Date().toISOString().slice(0, 10);

    const safeEventName =
      (selectedEvent.name || "Crown-Link-Event")
        .replace(/[^a-zA-Z0-9-_ ]/g, "")
        .trim()
        .replace(/\s+/g, "-");

    return new NextResponse(workbookBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeEventName}-Battle-Schedule-${today}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(
      "CROWN LINK BATTLE EXPORT ERROR:",
      error
    );

    return NextResponse.json(
      { error: "Something went wrong while exporting battles." },
      { status: 500 }
    );
  }
}
