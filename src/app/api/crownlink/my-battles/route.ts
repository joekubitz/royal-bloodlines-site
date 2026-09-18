import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    const accessToken = authorization.slice(7).trim();

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
  } = await supabase.auth.getUser();

  return user ?? null;
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: userRole, error: roleError } =
      await adminSupabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", user.id)
        .single();

    if (
      roleError ||
      !userRole ||
      userRole.status !== "active" ||
      !["creator", "admin", "agent"].includes(userRole.role)
    ) {
      return NextResponse.json(
        { error: "You do not have access to My Battles." },
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
          approved_at
        `)
        .eq("status", "approved")
        .or(
          `creator_one_id.eq.${user.id},creator_two_id.eq.${user.id}`
        )
        .order("approved_at", { ascending: true });

    if (matchesError) {
      console.error(
        "MY BATTLES MATCHES ERROR:",
        matchesError
      );

      return NextResponse.json(
        { error: "Unable to load your battles." },
        { status: 500 }
      );
    }

    const eventIds = Array.from(
      new Set(
        (matches ?? []).map((match) => match.event_id)
      )
    );

    const opponentIds = Array.from(
      new Set(
        (matches ?? []).map((match) =>
          match.creator_one_id === user.id
            ? match.creator_two_id
            : match.creator_one_id
        )
      )
    );

    let events: {
      id: string;
      name: string;
      event_date: string;
      event_time: string;
      status: string;
    }[] = [];

    let profiles: {
      user_id: string;
      display_name: string | null;
      tiktok_username: string;
      diamond_level: number;
    }[] = [];

    let roles: {
      user_id: string;
      agency_id: string | null;
    }[] = [];

    if (eventIds.length > 0) {
      const { data: eventData, error: eventsError } =
        await adminSupabase
          .from("crownlink_events")
          .select(`
            id,
            name,
            event_date,
            event_time,
            status
          `)
          .in("id", eventIds);

      if (eventsError) {
        console.error(
          "MY BATTLES EVENTS ERROR:",
          eventsError
        );
      } else {
        events = eventData ?? [];
      }
    }

    if (opponentIds.length > 0) {
      const { data: profileData, error: profilesError } =
        await adminSupabase
          .from("crownlink_profiles")
          .select(`
            user_id,
            display_name,
            tiktok_username,
            diamond_level
          `)
          .in("user_id", opponentIds);

      if (profilesError) {
        console.error(
          "MY BATTLES PROFILES ERROR:",
          profilesError
        );
      } else {
        profiles = profileData ?? [];
      }

      const { data: roleData, error: rolesError } =
        await adminSupabase
          .from("user_roles")
          .select(`
            user_id,
            agency_id
          `)
          .in("user_id", opponentIds);

      if (rolesError) {
        console.error(
          "MY BATTLES ROLES ERROR:",
          rolesError
        );
      } else {
        roles = roleData ?? [];
      }
    }

    const agencyIds = Array.from(
      new Set(
        roles
          .map((role) => role.agency_id)
          .filter(
            (agencyId): agencyId is string =>
              Boolean(agencyId)
          )
      )
    );

    let agencies: {
      id: string;
      name: string;
    }[] = [];

    if (agencyIds.length > 0) {
      const { data: agencyData, error: agenciesError } =
        await adminSupabase
          .from("crownlink_agencies")
          .select("id, name")
          .in("id", agencyIds);

      if (agenciesError) {
        console.error(
          "MY BATTLES AGENCIES ERROR:",
          agenciesError
        );
      } else {
        agencies = agencyData ?? [];
      }
    }

    const eventMap = new Map(
      events.map((event) => [event.id, event])
    );

    const profileMap = new Map(
      profiles.map((profile) => [
        profile.user_id,
        profile,
      ])
    );

    const roleMap = new Map(
      roles.map((role) => [role.user_id, role])
    );

    const agencyMap = new Map(
      agencies.map((agency) => [
        agency.id,
        agency.name,
      ])
    );

    const battles = (matches ?? []).map((match) => {
      const opponentId =
        match.creator_one_id === user.id
          ? match.creator_two_id
          : match.creator_one_id;

      const event = eventMap.get(match.event_id);
      const opponent = profileMap.get(opponentId);
      const opponentRole = roleMap.get(opponentId);

      const opponentAgency =
        opponentRole?.agency_id
          ? agencyMap.get(opponentRole.agency_id) ??
            "Unknown Agency"
          : "No Agency";

      const opponentName =
        opponent?.display_name?.trim() ||
        (opponent?.tiktok_username
          ? `@${opponent.tiktok_username}`
          : "Opponent");

      return {
        id: match.id,
        status: match.status,
        approved_at: match.approved_at,

        event: event
          ? {
              id: event.id,
              name: event.name,
              event_date: event.event_date,
              event_time: event.event_time,
              status: event.status,
            }
          : null,

        opponent: {
          user_id: opponentId,
          display_name: opponentName,
          tiktok_username:
            opponent?.tiktok_username ?? null,
          diamond_level:
            opponent?.diamond_level ?? 0,
          agency: opponentAgency,
        },
      };
    });

    return NextResponse.json({
      success: true,
      battles,
    });
  } catch (error) {
    console.error(
      "MY BATTLES API ERROR:",
      error
    );

    return NextResponse.json(
      { error: "Unable to load your battles." },
      { status: 500 }
    );
  }
}