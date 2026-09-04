import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import GenerateMatchesButton from "./GenerateMatchesButton";
import MatchActions from "./MatchActions";
import RecordResultsForm from "./RecordResultsForm";
import TestDataControls from "./TestDataControls";

export default async function CrownLinkMatchmakingAdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/crownlink/login");
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
    redirect("/crownlink");
  }

  const adminSupabase = createAdminClient();

  const today = new Date().toISOString().split("T")[0];

  const { data: events } = await adminSupabase
    .from("crownlink_events")
    .select(`
      id,
      name,
      event_date,
      event_time,
      status
    `)
    .eq("status", "active")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });

  const { data: matches } = await adminSupabase
    .from("crownlink_matches")
    .select(`
      id,
      event_id,
      creator_one_id,
      creator_two_id,
      status,
      event_date_id,
      schedule_slot_id,
      created_at
    `)
    .in("status", ["suggested", "approved"])
    .order("created_at", { ascending: true });

  const matchIds = (matches ?? []).map((match) => match.id);

  let matchAttendance: {
    match_id: string;
    creator_id: string;
    status: string;
  }[] = [];

  let matchResults: {
    match_id: string;
    creator_one_score: number | null;
    creator_two_score: number | null;
    score_screenshot_url: string | null;
  }[] = [];

  if (matchIds.length > 0) {
    const { data: attendanceData } = await adminSupabase
      .from("crownlink_match_attendance")
      .select(`
        match_id,
        creator_id,
        status
      `)
      .in("match_id", matchIds);

    matchAttendance = attendanceData ?? [];

    const { data: resultsData } = await adminSupabase
      .from("crownlink_match_results")
      .select(`
        match_id,
        creator_one_score,
        creator_two_score,
        score_screenshot_url
      `)
      .in("match_id", matchIds);

    matchResults = resultsData ?? [];
  }

  const attendanceByMatch = new Map<string, typeof matchAttendance>();

  for (const attendance of matchAttendance) {
    const current = attendanceByMatch.get(attendance.match_id) ?? [];
    current.push(attendance);
    attendanceByMatch.set(attendance.match_id, current);
  }

  const resultsByMatch = new Map(
    matchResults.map((result) => [result.match_id, result])
  );

  const { data: eventDates } = await adminSupabase
    .from("crownlink_event_dates")
    .select(`
      id,
      event_id,
      event_date
    `)
    .order("event_date", { ascending: true });

  const { data: scheduleSlots } = await adminSupabase
    .from("crownlink_schedule_slots")
    .select(`
      id,
      event_id,
      event_date_id,
      slot_time
    `)
    .order("slot_time", { ascending: true });

  const eventDateMap = new Map(
    (eventDates ?? []).map((eventDate) => [
      eventDate.id,
      eventDate,
    ])
  );

  const scheduleSlotMap = new Map(
    (scheduleSlots ?? []).map((slot) => [
      slot.id,
      slot,
    ])
  );

  const { data: signups } = await adminSupabase
    .from("crownlink_event_signups")
    .select(`
      event_id,
      user_id,
      status
    `)
    .eq("status", "signed_up");

  const creatorIds = Array.from(
    new Set(
      (matches ?? []).flatMap((match) => [
        match.creator_one_id,
        match.creator_two_id,
      ])
    )
  );

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

  if (creatorIds.length > 0) {
    const { data: profileData } = await adminSupabase
      .from("crownlink_profiles")
      .select(`
        user_id,
        display_name,
        tiktok_username,
        diamond_level
      `)
      .in("user_id", creatorIds);

    profiles = profileData ?? [];

    const { data: roleData } = await adminSupabase
      .from("user_roles")
      .select(`
        user_id,
        agency_id
      `)
      .in("user_id", creatorIds);

    roles = roleData ?? [];
  }

  const { data: agencies } = await adminSupabase
    .from("crownlink_agencies")
    .select(`
      id,
      name
    `);

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.user_id,
      profile,
    ])
  );

  const roleMap = new Map(
    roles.map((role) => [
      role.user_id,
      role,
    ])
  );

  const agencyMap = new Map(
    (agencies ?? []).map((agency) => [
      agency.id,
      agency.name,
    ])
  );

  function getCreator(userId: string) {
    const profile = profileMap.get(userId);
    const role = roleMap.get(userId);

    const agencyName =
      role?.agency_id
        ? agencyMap.get(role.agency_id) ?? "Unknown Agency"
        : "No Agency";

    const name =
      profile?.display_name?.trim() ||
      (profile?.tiktok_username
        ? `@${profile.tiktok_username}`
        : "Creator");

    return {
      name,
      username: profile?.tiktok_username ?? "",
      diamondLevel: Number(profile?.diamond_level ?? 0),
      agencyName,
    };
  }

  function formatDate(dateString: string) {
    const date = new Date(`${dateString}T12:00:00`);

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(timeString: string) {
    const [hourString, minuteString] =
      timeString.split(":");

    let hour = Number(hourString);
    const minute = minuteString || "00";

    const suffix = hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;

    return `${hour}:${minute} ${suffix}`;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #4b0d12 0%, #180607 35%, #050505 75%)",
        color: "white",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <Link
          href="/crownlink/admin"
          style={{
            color: "#d3a33c",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          ← Back to Admin Center
        </Link>

        <div
          style={{
            marginTop: 24,
            marginBottom: 30,
          }}
        >
          <p
            style={{
              color: "#d3a33c",
              letterSpacing: 4,
              fontSize: 12,
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            CROWN LINK
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: 40,
              fontWeight: 900,
            }}
          >
            Matchmaking
          </h1>

          <p
            style={{
              marginTop: 10,
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Generate and review 1v1 matches from event signups.
          </p>
        </div>

        {!events || events.length === 0 ? (
          <div
            style={{
              padding: 26,
              borderRadius: 18,
              border: "1px solid rgba(211,163,60,0.2)",
              background: "rgba(20,10,10,0.75)",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            No upcoming events are available for matchmaking.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 24,
            }}
          >
            {events.map((event) => {
              const eventMatches =
                matches?.filter(
                  (match) => match.event_id === event.id
                ) ?? [];

              const eventRequiredDates =
                eventDates?.filter(
                  (eventDate) => eventDate.event_id === event.id
                ) ?? [];

              const eventSignupIds =
                signups
                  ?.filter(
                    (signup) => signup.event_id === event.id
                  )
                  .map((signup) => signup.user_id) ?? [];

              const signedUpCreatorCount = eventSignupIds.length;
              const hasOddCreatorCount =
                signedUpCreatorCount % 2 !== 0;

              const dateCompletion = eventRequiredDates.map(
                (requiredDate) => {
                  const dateMatches = eventMatches.filter(
                    (match) =>
                      match.event_date_id === requiredDate.id
                  );

                  const matchedCreatorIds = new Set(
                    dateMatches.flatMap((match) => [
                      match.creator_one_id,
                      match.creator_two_id,
                    ])
                  );

                  const missingCreatorIds = eventSignupIds.filter(
                    (userId) => !matchedCreatorIds.has(userId)
                  );

                  return {
                    ...requiredDate,
                    matchedCreatorCount: matchedCreatorIds.size,
                    missingCreatorIds,
                    complete:
                      signedUpCreatorCount > 0 &&
                      missingCreatorIds.length === 0 &&
                      !hasOddCreatorCount,
                  };
                }
              );

              const scheduleComplete =
                eventRequiredDates.length > 0 &&
                signedUpCreatorCount > 0 &&
                !hasOddCreatorCount &&
                dateCompletion.every((date) => date.complete);

              return (
                <div
                  key={event.id}
                  style={{
                    borderRadius: 20,
                    border:
                      "1px solid rgba(211,163,60,0.22)",
                    background: "rgba(20,10,10,0.78)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: 24,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 20,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "#d3a33c",
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: 2,
                          textTransform: "uppercase",
                        }}
                      >
                        Upcoming Event
                      </p>

                      <h2
                        style={{
                          margin: "8px 0 0",
                          fontSize: 22,
                          fontWeight: 900,
                        }}
                      >
                        {event.name}
                      </h2>

                      <p
                        style={{
                          margin: "9px 0 0",
                          color: "rgba(255,255,255,0.5)",
                          fontSize: 13,
                        }}
                      >
                        {formatDate(event.event_date)}
                        {" • "}
                        {formatTime(event.event_time)}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 12,
                        minWidth: 220,
                      }}
                    >
                      <GenerateMatchesButton
                        eventId={event.id}
                        eventName={event.name}
                      />

                      <TestDataControls
                        eventId={event.id}
                        eventName={event.name}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      margin: "0 24px 24px",
                      padding: 16,
                      borderRadius: 14,
                      border: scheduleComplete
                        ? "1px solid rgba(80,210,110,0.25)"
                        : "1px solid rgba(255,170,70,0.25)",
                      background: scheduleComplete
                        ? "rgba(60,180,90,0.08)"
                        : "rgba(255,150,40,0.07)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 11,
                            fontWeight: 900,
                            letterSpacing: 1.2,
                            textTransform: "uppercase",
                            color: scheduleComplete
                              ? "#b8f5c2"
                              : "#ffc37d",
                          }}
                        >
                          {scheduleComplete
                            ? "Schedule Complete"
                            : "Schedule Incomplete"}
                        </p>

                        <p
                          style={{
                            margin: "6px 0 0",
                            color: "rgba(255,255,255,0.6)",
                            fontSize: 12,
                          }}
                        >
                          {signedUpCreatorCount} signed-up{" "}
                          {signedUpCreatorCount === 1
                            ? "creator"
                            : "creators"}
                          {" • "}
                          {eventRequiredDates.length} required{" "}
                          {eventRequiredDates.length === 1
                            ? "date"
                            : "dates"}
                        </p>
                      </div>

                      {hasOddCreatorCount && (
                        <span
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            background: "rgba(255,90,90,0.08)",
                            border:
                              "1px solid rgba(255,90,90,0.18)",
                            color: "#ffb0b0",
                            fontSize: 10,
                            fontWeight: 900,
                            textTransform: "uppercase",
                          }}
                        >
                          Odd creator count
                        </span>
                      )}
                    </div>

                    {eventRequiredDates.length === 0 ? (
                      <p
                        style={{
                          margin: "12px 0 0",
                          color: "#ffb0b0",
                          fontSize: 12,
                        }}
                      >
                        Add at least one required battle date before
                        generating the schedule.
                      </p>
                    ) : (
                      <div
                        style={{
                          marginTop: 14,
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        {dateCompletion.map((date) => (
                          <div
                            key={date.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 12,
                              padding: "9px 10px",
                              borderRadius: 10,
                              background: "rgba(0,0,0,0.16)",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              {formatDate(date.event_date)}
                            </span>

                            <span
                              style={{
                                fontSize: 11,
                                color: date.complete
                                  ? "#b8f5c2"
                                  : "#ffc37d",
                                fontWeight: 800,
                              }}
                            >
                              {date.complete
                                ? "Complete"
                                : `${date.matchedCreatorCount}/${signedUpCreatorCount} creators matched`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {!scheduleComplete &&
                      eventRequiredDates.length > 0 &&
                      signedUpCreatorCount > 0 && (
                        <p
                          style={{
                            margin: "12px 0 0",
                            color: "rgba(255,255,255,0.48)",
                            fontSize: 11,
                            lineHeight: 1.5,
                          }}
                        >
                          The schedule cannot be considered complete until
                          every signed-up creator has one match on every
                          required date.
                        </p>
                      )}
                  </div>

                  <div
                    style={{
                      padding: 24,
                      borderTop:
                        "1px solid rgba(255,255,255,0.06)",
                      background: "rgba(0,0,0,0.15)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 15,
                        marginBottom: 16,
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 17,
                          fontWeight: 900,
                        }}
                      >
                        Scheduled Matches
                      </h3>

                      <span
                        style={{
                          color: "rgba(255,255,255,0.4)",
                          fontSize: 12,
                        }}
                      >
                        {eventMatches.length}{" "}
                        {eventMatches.length === 1
                          ? "match"
                          : "matches"}
                      </span>
                    </div>

                    {eventMatches.length === 0 ? (
                      <p
                        style={{
                          margin: 0,
                          color: "rgba(255,255,255,0.4)",
                          fontSize: 13,
                        }}
                      >
                        No scheduled matches have been generated yet.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gap: 14,
                        }}
                      >
                        {eventMatches.map((match) => {
                          const creatorOne = getCreator(
                            match.creator_one_id
                          );

                          const creatorTwo = getCreator(
                            match.creator_two_id
                          );

                          const difference = Math.abs(
                            creatorOne.diamondLevel -
                              creatorTwo.diamondLevel
                          );

                          const matchDate = match.event_date_id
                            ? eventDateMap.get(match.event_date_id)
                            : null;

                          const matchSlot = match.schedule_slot_id
                            ? scheduleSlotMap.get(match.schedule_slot_id)
                            : null;

                          const attendance =
                            attendanceByMatch.get(match.id) ?? [];

                          const result = resultsByMatch.get(match.id);

                          const hasNoShow = attendance.some(
                            (row) => row.status === "no_show"
                          );

                          const hasReplacement = attendance.some(
                            (row) => row.status === "replacement"
                          );

                          const bothAttendanceMarked =
                            attendance.filter(
                              (row) => row.status !== "unmarked"
                            ).length >= 2;

                          const hasBothScores =
                            result?.creator_one_score !== null &&
                            result?.creator_one_score !== undefined &&
                            result?.creator_two_score !== null &&
                            result?.creator_two_score !== undefined;

                          let resultStatus = "Needs Results";
                          let resultStatusColor = "rgba(255,255,255,0.55)";
                          let resultStatusBackground =
                            "rgba(255,255,255,0.05)";
                          let resultStatusBorder =
                            "1px solid rgba(255,255,255,0.1)";

                          if (hasNoShow) {
                            resultStatus = "No Show";
                            resultStatusColor = "#ffb0b0";
                            resultStatusBackground =
                              "rgba(255,90,90,0.08)";
                            resultStatusBorder =
                              "1px solid rgba(255,90,90,0.2)";
                          } else if (hasReplacement) {
                            resultStatus = "Replacement Used";
                            resultStatusColor = "#ffc37d";
                            resultStatusBackground =
                              "rgba(255,150,40,0.08)";
                            resultStatusBorder =
                              "1px solid rgba(255,150,40,0.2)";
                          } else if (bothAttendanceMarked && hasBothScores) {
                            resultStatus = "Results Recorded";
                            resultStatusColor = "#b8f5c2";
                            resultStatusBackground =
                              "rgba(60,180,90,0.08)";
                            resultStatusBorder =
                              "1px solid rgba(80,210,110,0.22)";
                          }

                          return (
                            <div
                              key={match.id}
                              style={{
                                padding: 20,
                                borderRadius: 16,
                                border:
                                  "1px solid rgba(211,163,60,0.16)",
                                background:
                                  "rgba(255,255,255,0.025)",
                              }}
                            >
                              <div
                                style={{
                                  marginBottom: 16,
                                  padding: "12px 14px",
                                  borderRadius: 12,
                                  background: "rgba(211,163,60,0.07)",
                                  border: "1px solid rgba(211,163,60,0.18)",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 12,
                                  flexWrap: "wrap",
                                }}
                              >
                                <div>
                                  <p
                                    style={{
                                      margin: 0,
                                      color: "rgba(255,255,255,0.42)",
                                      fontSize: 9,
                                      fontWeight: 900,
                                      letterSpacing: 1.3,
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    Required Battle Date
                                  </p>

                                  <p
                                    style={{
                                      margin: "5px 0 0",
                                      fontSize: 14,
                                      fontWeight: 900,
                                      color: "#d3a33c",
                                    }}
                                  >
                                    {matchDate
                                      ? formatDate(matchDate.event_date)
                                      : "Date not assigned"}
                                  </p>
                                </div>

                                <div
                                  style={{
                                    textAlign: "right",
                                  }}
                                >
                                  <p
                                    style={{
                                      margin: 0,
                                      color: "rgba(255,255,255,0.42)",
                                      fontSize: 9,
                                      fontWeight: 900,
                                      letterSpacing: 1.3,
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    Battle Time
                                  </p>

                                  <p
                                    style={{
                                      margin: "5px 0 0",
                                      fontSize: 14,
                                      fontWeight: 900,
                                    }}
                                  >
                                    {matchSlot
                                      ? formatTime(matchSlot.slot_time)
                                      : "Time not assigned"}
                                  </p>
                                </div>
                              </div>

                              {(!matchDate || !matchSlot) && (
                                <div
                                  style={{
                                    marginBottom: 16,
                                    padding: "10px 12px",
                                    borderRadius: 10,
                                    background: "rgba(255,90,90,0.07)",
                                    border: "1px solid rgba(255,90,90,0.18)",
                                    color: "#ffb0b0",
                                    fontSize: 11,
                                    fontWeight: 800,
                                  }}
                                >
                                  This is a legacy match from before multi-date
                                  scheduling. Cancel it before generating the new
                                  schedule.
                                </div>
                              )}

                              <div
                                style={{
                                  display: "flex",
                                  justifyContent:
                                    "space-between",
                                  alignItems: "center",
                                  gap: 12,
                                  marginBottom: 18,
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    padding: "6px 10px",
                                    borderRadius: 999,
                                    background:
                                      match.status === "approved"
                                        ? "rgba(60,180,90,0.12)"
                                        : "rgba(211,163,60,0.1)",
                                    border:
                                      match.status === "approved"
                                        ? "1px solid rgba(80,210,110,0.25)"
                                        : "1px solid rgba(211,163,60,0.2)",
                                    color:
                                      match.status === "approved"
                                        ? "#b8f5c2"
                                        : "#d3a33c",
                                    fontSize: 10,
                                    fontWeight: 900,
                                    letterSpacing: 1,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {match.status}
                                </span>

                                <span
                                  style={{
                                    color:
                                      "rgba(255,255,255,0.4)",
                                    fontSize: 11,
                                  }}
                                >
                                  Diamond difference:{" "}
                                  {difference.toLocaleString()}
                                </span>
                              </div>

                              {match.status === "approved" && (
                                <div
                                  style={{
                                    marginBottom: 16,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span
                                    style={{
                                      padding: "7px 11px",
                                      borderRadius: 999,
                                      background: resultStatusBackground,
                                      border: resultStatusBorder,
                                      color: resultStatusColor,
                                      fontSize: 10,
                                      fontWeight: 900,
                                      letterSpacing: 0.8,
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {resultStatus}
                                  </span>

                                  {result?.score_screenshot_url && (
                                    <span
                                      style={{
                                        color: "rgba(255,255,255,0.42)",
                                        fontSize: 10,
                                        fontWeight: 800,
                                      }}
                                    >
                                      Score screenshot uploaded
                                    </span>
                                  )}
                                </div>
                              )}

                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "minmax(0, 1fr) auto minmax(0, 1fr)",
                                  gap: 18,
                                  alignItems: "center",
                                }}
                              >
                                <CreatorCard
                                  creator={creatorOne}
                                />

                                <div
                                  style={{
                                    width: 46,
                                    height: 46,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background:
                                      "rgba(211,163,60,0.1)",
                                    border:
                                      "1px solid rgba(211,163,60,0.25)",
                                    color: "#d3a33c",
                                    fontSize: 13,
                                    fontWeight: 900,
                                  }}
                                >
                                  VS
                                </div>

                                <CreatorCard
                                  creator={creatorTwo}
                                />
                              </div>

                              {(match.status === "approved" ||
                                match.status === "suggested") && (
                                <MatchActions
                                  matchId={match.id}
                                  eventId={event.id}
                                  status={match.status}
                                />
                              )}

                              {match.status === "approved" && (
                                <RecordResultsForm
                                  matchId={match.id}
                                  creatorOne={{
                                    id: match.creator_one_id,
                                    name: creatorOne.name,
                                    username: creatorOne.username,
                                  }}
                                  creatorTwo={{
                                    id: match.creator_two_id,
                                    name: creatorTwo.name,
                                    username: creatorTwo.username,
                                  }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function CreatorCard({
  creator,
}: {
  creator: {
    name: string;
    username: string;
    diamondLevel: number;
    agencyName: string;
  };
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        background: "rgba(0,0,0,0.2)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 900,
        }}
      >
        {creator.name}
      </p>

      {creator.username && (
        <p
          style={{
            margin: "5px 0 0",
            color: "rgba(255,255,255,0.45)",
            fontSize: 12,
          }}
        >
          @{creator.username}
        </p>
      )}

      <p
        style={{
          margin: "11px 0 0",
          color: "#d3a33c",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {creator.agencyName}
      </p>

      <p
        style={{
          margin: "7px 0 0",
          color: "rgba(255,255,255,0.7)",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {creator.diamondLevel.toLocaleString()} diamonds
      </p>
    </div>
  );
}