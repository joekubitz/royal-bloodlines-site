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
    .select("role, status, can_run_matchmaking")
    .eq("user_id", user.id)
    .single();

  const canRunMatchmaking =
    userRole?.status === "active" &&
    (
      userRole.role === "admin" ||
      userRole.can_run_matchmaking === true
    );

  if (!canRunMatchmaking) {
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
    <main style={pageStyle}>
      <div style={{ width: "100%", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <Link href="/crownlink/admin" style={backButtonStyle}>← Admin Center</Link>
        </div>

        <section style={heroStyle}>
          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={heroBadgeStyle}><span style={goldDotStyle} /> Crown Link · Battle Operations</div>
            <h1 style={heroTitleStyle}>Matchmaking</h1>
            <div style={heroLineStyle} />
            <p style={heroCopyStyle}>Generate, review, and manage 1v1 battle schedules from event signups.</p>
          </div>
        </section>

        {!events || events.length === 0 ? (
          <div style={emptyStateStyle}>No upcoming events are available for matchmaking.</div>
        ) : (
          <div style={{ display: "grid", gap: 20 }}>
            {events.map((event) => {
              const eventMatches = matches?.filter((match) => match.event_id === event.id) ?? [];
              const eventRequiredDates = eventDates?.filter((eventDate) => eventDate.event_id === event.id) ?? [];
              const eventSignupIds = signups?.filter((signup) => signup.event_id === event.id).map((signup) => signup.user_id) ?? [];
              const signedUpCreatorCount = eventSignupIds.length;
              const hasOddCreatorCount = signedUpCreatorCount % 2 !== 0;

              const dateCompletion = eventRequiredDates.map((requiredDate) => {
                const dateMatches = eventMatches.filter((match) => match.event_date_id === requiredDate.id);
                const matchedCreatorIds = new Set(dateMatches.flatMap((match) => [match.creator_one_id, match.creator_two_id]));
                const missingCreatorIds = eventSignupIds.filter((userId) => !matchedCreatorIds.has(userId));

                return {
                  ...requiredDate,
                  matchedCreatorCount: matchedCreatorIds.size,
                  missingCreatorIds,
                  complete: signedUpCreatorCount > 0 && missingCreatorIds.length === 0 && !hasOddCreatorCount,
                };
              });

              const scheduleComplete =
                eventRequiredDates.length > 0 &&
                signedUpCreatorCount > 0 &&
                !hasOddCreatorCount &&
                dateCompletion.every((date) => date.complete);

              return (
                <article key={event.id} style={eventCardStyle}>
                  <div style={eventTopStyle}>
                    <div style={{ flex: "1 1 420px" }}>
                      <p style={sectionEyebrowStyle}>Upcoming Event</p>
                      <h2 style={eventTitleStyle}>{event.name}</h2>
                      <p style={eventMetaStyle}>{formatDate(event.event_date)} · <span style={{ color: "#d9b15c", fontWeight: 900 }}>{formatTime(event.event_time)}</span></p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                        <StatPill value={signedUpCreatorCount} label="Creators" />
                        <StatPill value={eventRequiredDates.length} label="Dates" />
                        <StatPill value={eventMatches.length} label="Matches" />
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 10, minWidth: 220 }}>
                      <GenerateMatchesButton eventId={event.id} eventName={event.name} />
                      <TestDataControls eventId={event.id} eventName={event.name} />
                    </div>
                  </div>

                  <div style={sectionStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <p style={sectionEyebrowStyle}>Schedule Health</p>
                        <h3 style={{ margin: "5px 0 0", fontSize: 17, fontWeight: 950, color: "#f9f4ed" }}>
                          {scheduleComplete ? "Schedule Complete" : "Schedule Incomplete"}
                        </h3>
                        <p style={smallMutedStyle}>{signedUpCreatorCount} signed-up {signedUpCreatorCount === 1 ? "creator" : "creators"} · {eventRequiredDates.length} required {eventRequiredDates.length === 1 ? "date" : "dates"}</p>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={scheduleComplete ? completeBadgeStyle : incompleteBadgeStyle}>{scheduleComplete ? "Complete" : "Needs Attention"}</span>
                        {hasOddCreatorCount && <span style={dangerBadgeStyle}>Odd Creator Count</span>}
                      </div>
                    </div>

                    {eventRequiredDates.length === 0 ? (
                      <div style={warningBoxStyle}>Add at least one required battle date before generating the schedule.</div>
                    ) : (
                      <div style={{ display: "grid", gap: 8, marginTop: 15 }}>
                        {dateCompletion.map((date) => (
                          <div key={date.id} style={dateRowStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                              <span style={{ ...goldDotStyle, background: date.complete ? "#8dbb91" : "#c99732" }} />
                              <span style={{ fontSize: 11, fontWeight: 900, color: "#f7f1e8" }}>{formatDate(date.event_date)}</span>
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 900, color: date.complete ? "#9fc7a3" : "#d9b15c" }}>
                              {date.complete ? "Complete" : `${date.matchedCreatorCount}/${signedUpCreatorCount} creators matched`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {!scheduleComplete && eventRequiredDates.length > 0 && signedUpCreatorCount > 0 && (
                      <p style={{ ...smallMutedStyle, marginTop: 12 }}>The schedule cannot be considered complete until every signed-up creator has one match on every required date.</p>
                    )}
                  </div>

                  <div style={{ ...sectionStyle, background: "rgba(0,0,0,0.14)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 15 }}>
                      <div>
                        <p style={sectionEyebrowStyle}>Battle Schedule</p>
                        <h3 style={{ margin: "5px 0 0", fontSize: 18, fontWeight: 950, color: "#f9f4ed" }}>Scheduled Matches</h3>
                      </div>
                      <span style={countPillStyle}>{eventMatches.length} {eventMatches.length === 1 ? "match" : "matches"}</span>
                    </div>

                    {eventMatches.length === 0 ? (
                      <p style={smallMutedStyle}>No scheduled matches have been generated yet.</p>
                    ) : (
                      <div style={{ display: "grid", gap: 13 }}>
                        {eventMatches.map((match) => {
                          const creatorOne = getCreator(match.creator_one_id);
                          const creatorTwo = getCreator(match.creator_two_id);
                          const difference = Math.abs(creatorOne.diamondLevel - creatorTwo.diamondLevel);
                          const matchDate = match.event_date_id ? eventDateMap.get(match.event_date_id) : null;
                          const matchSlot = match.schedule_slot_id ? scheduleSlotMap.get(match.schedule_slot_id) : null;
                          const attendance = attendanceByMatch.get(match.id) ?? [];
                          const result = resultsByMatch.get(match.id);
                          const hasNoShow = attendance.some((row) => row.status === "no_show");
                          const hasReplacement = attendance.some((row) => row.status === "replacement");
                          const bothAttendanceMarked = attendance.filter((row) => row.status !== "unmarked").length >= 2;
                          const hasBothScores = result?.creator_one_score !== null && result?.creator_one_score !== undefined && result?.creator_two_score !== null && result?.creator_two_score !== undefined;

                          let resultStatus = "Needs Results";
                          let resultStatusColor = "rgba(247,241,232,0.5)";
                          let resultStatusBackground = "rgba(255,255,255,0.04)";
                          let resultStatusBorder = "1px solid rgba(255,255,255,0.08)";

                          if (hasNoShow) {
                            resultStatus = "No Show";
                            resultStatusColor = "#d88b8b";
                            resultStatusBackground = "rgba(95,10,15,0.14)";
                            resultStatusBorder = "1px solid rgba(180,65,65,0.2)";
                          } else if (hasReplacement) {
                            resultStatus = "Replacement Used";
                            resultStatusColor = "#e6a35f";
                            resultStatusBackground = "rgba(120,55,0,0.12)";
                            resultStatusBorder = "1px solid rgba(232,111,0,0.18)";
                          } else if (bothAttendanceMarked && hasBothScores) {
                            resultStatus = "Results Recorded";
                            resultStatusColor = "#9fc7a3";
                            resultStatusBackground = "rgba(45,105,55,0.12)";
                            resultStatusBorder = "1px solid rgba(100,170,110,0.18)";
                          }

                          return (
                            <div key={match.id} style={matchCardStyle}>
                              <div style={matchHeaderStyle}>
                                <div>
                                  <p style={miniLabelStyle}>Required Battle Date</p>
                                  <p style={{ margin: "5px 0 0", color: "#d9b15c", fontSize: 12, fontWeight: 950 }}>{matchDate ? formatDate(matchDate.event_date) : "Date not assigned"}</p>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <p style={miniLabelStyle}>Battle Time</p>
                                  <p style={{ margin: "5px 0 0", color: "#f9f4ed", fontSize: 12, fontWeight: 950 }}>{matchSlot ? formatTime(matchSlot.slot_time) : "Time not assigned"}</p>
                                </div>
                              </div>

                              {(!matchDate || !matchSlot) && <div style={warningBoxStyle}>This is a legacy match from before multi-date scheduling. Cancel it before generating the new schedule.</div>}

                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 13 }}>
                                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                                  <span style={match.status === "approved" ? approvedBadgeStyle : suggestedBadgeStyle}>{match.status}</span>
                                  {match.status === "approved" && <span style={{ ...statusBadgeBase, background: resultStatusBackground, border: resultStatusBorder, color: resultStatusColor }}>{resultStatus}</span>}
                                </div>
                                <span style={{ color: "rgba(247,241,232,0.3)", fontSize: 9 }}>Diamond difference: <strong style={{ color: "#d9b15c" }}>{difference.toLocaleString()}</strong></span>
                              </div>

                              {result?.score_screenshot_url && <p style={{ margin: "0 0 12px", color: "rgba(247,241,232,0.3)", fontSize: 9, fontWeight: 800 }}>Score screenshot uploaded</p>}

                              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", gap: 12, alignItems: "center" }}>
                                <CreatorCard creator={creatorOne} />
                                <div style={vsStyle}>VS</div>
                                <CreatorCard creator={creatorTwo} />
                              </div>

                              {(match.status === "approved" || match.status === "suggested") && <MatchActions matchId={match.id} eventId={event.id} status={match.status} />}

                              {match.status === "approved" && (
                                <RecordResultsForm
                                  matchId={match.id}
                                  creatorOne={{ id: match.creator_one_id, name: creatorOne.name, username: creatorOne.username }}
                                  creatorTwo={{ id: match.creator_two_id, name: creatorTwo.name, username: creatorTwo.username }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer style={footerStyle}><span>Royals Bloodline</span><span>Crown Link · Matchmaking</span></footer>
      </div>
    </main>
  );
}

function CreatorCard({ creator }: { creator: { name: string; username: string; diamondLevel: number; agencyName: string } }) {
  return (
    <div style={creatorCardStyle}>
      <p style={{ margin: 0, color: "#f9f4ed", fontSize: 14, fontWeight: 950 }}>{creator.name}</p>
      {creator.username && <p style={{ margin: "4px 0 0", color: "rgba(247,241,232,0.3)", fontSize: 9 }}>@{creator.username}</p>}
      <p style={{ margin: "9px 0 0", color: "#c99732", fontSize: 9, fontWeight: 900 }}>{creator.agencyName}</p>
      <p style={{ margin: "5px 0 0", color: "rgba(247,241,232,0.64)", fontSize: 11, fontWeight: 800 }}>{creator.diamondLevel.toLocaleString()} diamonds</p>
    </div>
  );
}

function StatPill({ value, label }: { value: number; label: string }) {
  return <div style={statPillStyle}><strong style={{ color: "#d9b15c", fontSize: 13 }}>{value}</strong><span style={{ color: "rgba(247,241,232,0.25)", fontSize: 7, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</span></div>;
}

const pageStyle = { minHeight: "100vh", color: "#f7f1e8", background: "radial-gradient(circle at 12% 4%, rgba(88,7,12,0.40), transparent 27%), radial-gradient(circle at 92% 32%, rgba(116,22,0,0.08), transparent 28%), linear-gradient(180deg, #080808 0%, #040404 48%, #010101 100%)", padding: "28px 20px 70px" };
const backButtonStyle = { display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 999, border: "1px solid rgba(201,151,50,0.13)", background: "rgba(0,0,0,0.28)", color: "#d9b15c", textDecoration: "none", fontSize: 8, fontWeight: 950, letterSpacing: 0.5, textTransform: "uppercase" as const };
const heroStyle = { position: "relative" as const, overflow: "hidden", padding: "24px 27px", borderRadius: 24, border: "1px solid rgba(201,151,50,0.19)", background: "linear-gradient(130deg, rgba(48,5,9,0.90), rgba(14,10,10,0.95) 53%, rgba(3,3,3,0.98))", boxShadow: "0 22px 55px rgba(0,0,0,0.45)", marginBottom: 24 };
const heroBadgeStyle = { display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 9px", borderRadius: 999, border: "1px solid rgba(201,151,50,0.20)", background: "rgba(201,151,50,0.045)", marginBottom: 10, color: "#d9b15c", fontSize: 7, fontWeight: 950, letterSpacing: 1.8, textTransform: "uppercase" as const };
const goldDotStyle = { width: 5, height: 5, borderRadius: "50%", background: "#c99732", display: "inline-block" };
const heroTitleStyle = { margin: 0, color: "#f9f4ed", fontSize: "clamp(30px,5vw,42px)", fontWeight: 950, letterSpacing: -1.4, lineHeight: 1 };
const heroLineStyle = { width: 58, height: 2, marginTop: 11, background: "linear-gradient(90deg, #e86f00, #c99732, transparent)" };
const heroCopyStyle = { margin: "10px 0 0", maxWidth: 650, color: "rgba(247,241,232,0.4)", fontSize: 11, lineHeight: 1.6 };
const eventCardStyle = { overflow: "hidden", borderRadius: 22, border: "1px solid rgba(201,151,50,0.17)", background: "linear-gradient(145deg, rgba(18,14,14,0.96), rgba(4,4,4,0.98))", boxShadow: "0 20px 45px rgba(0,0,0,0.34)" };
const eventTopStyle = { padding: 22, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" as const, background: "linear-gradient(135deg, rgba(48,5,9,0.52), rgba(7,7,7,0.72) 60%, rgba(3,3,3,0.88))" };
const sectionStyle = { padding: 22, borderTop: "1px solid rgba(201,151,50,0.08)" };
const sectionEyebrowStyle = { margin: 0, color: "#c99732", fontSize: 7, fontWeight: 950, letterSpacing: 1.9, textTransform: "uppercase" as const };
const eventTitleStyle = { margin: "7px 0 0", color: "#f9f4ed", fontSize: "clamp(21px,3vw,28px)", fontWeight: 950, letterSpacing: -0.7 };
const eventMetaStyle = { margin: "8px 0 0", color: "rgba(247,241,232,0.38)", fontSize: 10 };
const smallMutedStyle = { margin: "6px 0 0", color: "rgba(247,241,232,0.3)", fontSize: 10, lineHeight: 1.5 };
const statPillStyle = { display: "inline-flex", alignItems: "baseline", gap: 6, padding: "6px 9px", borderRadius: 999, border: "1px solid rgba(201,151,50,0.11)", background: "rgba(0,0,0,0.24)" };
const dateRowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 11px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.045)", background: "rgba(0,0,0,0.18)", flexWrap: "wrap" as const };
const countPillStyle = { padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(201,151,50,0.14)", background: "rgba(201,151,50,0.04)", color: "#d9b15c", fontSize: 8, fontWeight: 900 };
const completeBadgeStyle = { padding: "6px 9px", borderRadius: 999, border: "1px solid rgba(100,170,110,0.18)", background: "rgba(45,105,55,0.12)", color: "#9fc7a3", fontSize: 8, fontWeight: 950, textTransform: "uppercase" as const };
const incompleteBadgeStyle = { padding: "6px 9px", borderRadius: 999, border: "1px solid rgba(201,151,50,0.16)", background: "rgba(201,151,50,0.05)", color: "#d9b15c", fontSize: 8, fontWeight: 950, textTransform: "uppercase" as const };
const dangerBadgeStyle = { padding: "6px 9px", borderRadius: 999, border: "1px solid rgba(180,65,65,0.2)", background: "rgba(95,10,15,0.14)", color: "#d88b8b", fontSize: 8, fontWeight: 950, textTransform: "uppercase" as const };
const warningBoxStyle = { marginTop: 13, padding: "10px 12px", borderRadius: 11, background: "rgba(95,10,15,0.12)", border: "1px solid rgba(180,65,65,0.18)", color: "#d88b8b", fontSize: 9, fontWeight: 800, lineHeight: 1.5 };
const matchCardStyle = { padding: 17, borderRadius: 16, border: "1px solid rgba(201,151,50,0.12)", background: "linear-gradient(145deg, rgba(20,14,14,0.72), rgba(5,5,5,0.9))" };
const matchHeaderStyle = { marginBottom: 13, padding: "11px 12px", borderRadius: 12, background: "rgba(201,151,50,0.035)", border: "1px solid rgba(201,151,50,0.11)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" as const };
const miniLabelStyle = { margin: 0, color: "rgba(247,241,232,0.22)", fontSize: 7, fontWeight: 950, letterSpacing: 1.1, textTransform: "uppercase" as const };
const statusBadgeBase = { padding: "5px 8px", borderRadius: 999, fontSize: 7, fontWeight: 950, letterSpacing: 0.8, textTransform: "uppercase" as const };
const approvedBadgeStyle = { ...statusBadgeBase, background: "rgba(45,105,55,0.12)", border: "1px solid rgba(100,170,110,0.18)", color: "#9fc7a3" };
const suggestedBadgeStyle = { ...statusBadgeBase, background: "rgba(201,151,50,0.05)", border: "1px solid rgba(201,151,50,0.15)", color: "#d9b15c" };
const creatorCardStyle = { padding: 14, borderRadius: 13, background: "rgba(0,0,0,0.24)", border: "1px solid rgba(255,255,255,0.05)", minWidth: 0 };
const vsStyle = { width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(232,111,0,0.07)", border: "1px solid rgba(201,151,50,0.18)", color: "#e86f00", fontSize: 10, fontWeight: 950 };
const emptyStateStyle = { padding: 22, borderRadius: 18, border: "1px dashed rgba(201,151,50,0.16)", background: "rgba(10,8,8,0.72)", color: "rgba(247,241,232,0.32)", fontSize: 11 };
const footerStyle = { marginTop: 45, paddingTop: 17, borderTop: "1px solid rgba(201,151,50,0.08)", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" as const, color: "rgba(247,241,232,0.14)", fontSize: 8, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase" as const };
