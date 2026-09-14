import { createAdminClient } from "@/app/supabase/admin";

export type AttendanceEnforcementStatus = {
  userId: string;

  lifetimeNoShows: number;
  lifetimeReplacements: number;

  activeStrikes: number;

  signupSuspended: boolean;
  suspendedAt: string | null;
  suspendedUntil: string | null;

  priorSuspensions: number;

  lastNoShowAt: string | null;
  lastReplacementAt: string | null;
};

const STRIKES_BEFORE_SUSPENSION = 3;
const SUSPENSION_DAYS = 30;

function addDays(
  date: Date,
  days: number
) {
  const result = new Date(date);

  result.setDate(
    result.getDate() + days
  );

  return result;
}

export async function syncAttendanceEnforcement(
  userId: string
): Promise<AttendanceEnforcementStatus> {
  const db = createAdminClient();

  /*
   * Load every recorded attendance entry
   * for this creator.
   *
   * We recalculate totals from the source
   * table so corrections remain accurate.
   */
  const {
    data: attendanceRows,
    error: attendanceError,
  } = await db
    .from("crownlink_match_attendance")
    .select(`
      id,
      status,
      updated_at
    `)
    .eq("creator_id", userId);

  if (attendanceError) {
    console.error(
      "ATTENDANCE ENFORCEMENT ATTENDANCE LOAD ERROR:",
      attendanceError
    );

    throw new Error(
      attendanceError.message
    );
  }

  const attendance =
    attendanceRows ?? [];

  const noShows =
    attendance.filter(
      (row) =>
        row.status === "no_show"
    );

  const replacements =
    attendance.filter(
      (row) =>
        row.status === "replacement"
    );

  const lifetimeNoShows =
    noShows.length;

  const lifetimeReplacements =
    replacements.length;

  /*
   * Find most recent no-show and
   * replacement timestamps.
   */
  const lastNoShowAt =
    noShows
      .map((row) => row.updated_at)
      .filter(Boolean)
      .sort()
      .reverse()[0] ?? null;

  const lastReplacementAt =
    replacements
      .map((row) => row.updated_at)
      .filter(Boolean)
      .sort()
      .reverse()[0] ?? null;

  /*
   * Load existing enforcement record.
   */
  const {
    data: current,
    error: currentError,
  } = await db
    .from(
      "crownlink_attendance_enforcement"
    )
    .select(`
      user_id,
      active_strikes,
      lifetime_no_shows,
      lifetime_replacements,
      signup_suspended,
      suspended_at,
      suspended_until,
      prior_suspensions
    `)
    .eq("user_id", userId)
    .maybeSingle();

  if (currentError) {
    console.error(
      "ATTENDANCE ENFORCEMENT LOAD ERROR:",
      currentError
    );

    throw new Error(
      currentError.message
    );
  }

  const now = new Date();

  let priorSuspensions =
    Number(
      current?.prior_suspensions ??
        0
    );

  let signupSuspended =
    Boolean(
      current?.signup_suspended
    );

  let suspendedAt =
    current?.suspended_at ??
    null;

  let suspendedUntil =
    current?.suspended_until ??
    null;

  /*
   * If the current 30-day suspension
   * expired, close that suspension cycle.
   */
  if (
    signupSuspended &&
    suspendedUntil &&
    new Date(suspendedUntil) <= now
  ) {
    priorSuspensions += 1;

    signupSuspended = false;
    suspendedAt = null;
    suspendedUntil = null;
  }

  /*
   * Every completed suspension accounts
   * for three historical strikes.
   *
   * Example:
   *
   * 3 lifetime no-shows
   * 1 completed suspension
   * = 0 current strikes
   *
   * 5 lifetime no-shows
   * 1 completed suspension
   * = 2 current strikes
   */
  let activeStrikes =
    Math.max(
      0,
      lifetimeNoShows -
        priorSuspensions *
          STRIKES_BEFORE_SUSPENSION
    );

  activeStrikes =
    Math.min(
      activeStrikes,
      STRIKES_BEFORE_SUSPENSION
    );

  /*
   * If attendance was corrected and the
   * creator no longer has 3 strikes,
   * remove an active automated suspension.
   */
  if (
    signupSuspended &&
    activeStrikes <
      STRIKES_BEFORE_SUSPENSION
  ) {
    signupSuspended = false;
    suspendedAt = null;
    suspendedUntil = null;
  }

  /*
   * Three strikes automatically starts
   * a 30-day battle-signup suspension.
   */
  if (
    !signupSuspended &&
    activeStrikes >=
      STRIKES_BEFORE_SUSPENSION
  ) {
    const suspensionStart =
      new Date();

    const suspensionEnd =
      addDays(
        suspensionStart,
        SUSPENSION_DAYS
      );

    signupSuspended = true;

    suspendedAt =
      suspensionStart.toISOString();

    suspendedUntil =
      suspensionEnd.toISOString();

    activeStrikes =
      STRIKES_BEFORE_SUSPENSION;
  }

  /*
   * Save the synchronized enforcement
   * state.
   */
  const {
    data: saved,
    error: saveError,
  } = await db
    .from(
      "crownlink_attendance_enforcement"
    )
    .upsert(
      {
        user_id: userId,

        active_strikes:
          activeStrikes,

        lifetime_no_shows:
          lifetimeNoShows,

        lifetime_replacements:
          lifetimeReplacements,

        signup_suspended:
          signupSuspended,

        suspended_at:
          suspendedAt,

        suspended_until:
          suspendedUntil,

        prior_suspensions:
          priorSuspensions,

        last_no_show_at:
          lastNoShowAt,

        last_replacement_at:
          lastReplacementAt,

        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    )
    .select(`
      user_id,
      active_strikes,
      lifetime_no_shows,
      lifetime_replacements,
      signup_suspended,
      suspended_at,
      suspended_until,
      prior_suspensions,
      last_no_show_at,
      last_replacement_at
    `)
    .single();

  if (
    saveError ||
    !saved
  ) {
    console.error(
      "ATTENDANCE ENFORCEMENT SAVE ERROR:",
      saveError
    );

    throw new Error(
      saveError?.message ||
        "Attendance enforcement could not be updated."
    );
  }

  return {
    userId:
      saved.user_id,

    lifetimeNoShows:
      saved.lifetime_no_shows,

    lifetimeReplacements:
      saved.lifetime_replacements,

    activeStrikes:
      saved.active_strikes,

    signupSuspended:
      saved.signup_suspended,

    suspendedAt:
      saved.suspended_at,

    suspendedUntil:
      saved.suspended_until,

    priorSuspensions:
      saved.prior_suspensions,

    lastNoShowAt:
      saved.last_no_show_at,

    lastReplacementAt:
      saved.last_replacement_at,
  };
}