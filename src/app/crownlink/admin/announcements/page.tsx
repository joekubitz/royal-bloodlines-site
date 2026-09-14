import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import { createAnnouncement } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(
  dateString: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(new Date(dateString));
}

function audienceLabel(
  audience: string,
  agencyName?: string | null
) {
  switch (audience) {
    case "creators":
      return "Creators";

    case "agents":
      return "Agents";

    case "agency":
      return agencyName
        ? `Agency · ${agencyName}`
        : "Specific Agency";

    default:
      return "Everyone";
  }
}

export default async function AnnouncementsPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: roleRow } =
    await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

  if (
    !roleRow ||
    roleRow.role !== "admin" ||
    roleRow.status !== "active"
  ) {
    redirect("/bloodline-arena");
  }

  const db =
    createAdminClient();

  const {
    data: agencies,
  } = await db
    .from("crownlink_agencies")
    .select("id, name")
    .eq("status", "active")
    .order("name", {
      ascending: true,
    });

  const {
    data: announcements,
    error,
  } = await db
    .from("crownlink_announcements")
    .select(`
      id,
      title,
      message,
      audience,
      agency_id,
      href,
      send_notification,
      send_discord,
      status,
      published_at,
      created_at
    `)
    .order("created_at", {
      ascending: false,
    })
    .limit(50);

  if (error) {
    console.error(
      "ANNOUNCEMENT LOAD ERROR:",
      error
    );
  }

  const agencyMap =
    new Map(
      (agencies ?? []).map(
        (agency) => [
          agency.id,
          agency.name,
        ]
      )
    );

  return (
    <main
      style={{
        minHeight: "100vh",
        color: "#f7f1e8",
        background: `
          radial-gradient(
            circle at 14% 7%,
            rgba(88,7,12,0.42),
            transparent 30%
          ),
          radial-gradient(
            circle at 88% 26%,
            rgba(116,22,0,0.10),
            transparent 30%
          ),
          linear-gradient(
            180deg,
            #080808 0%,
            #040404 46%,
            #010101 100%
          )
        `,
        padding: "30px 20px 70px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: 24,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#c99732",
              fontSize: 9,
              fontWeight: 950,
              letterSpacing: 2.5,
              textTransform:
                "uppercase",
            }}
          >
            Bloodline Arena Administration
          </p>

          <h1
            style={{
              margin: "7px 0 0",
              fontSize:
                "clamp(32px,5vw,46px)",
              fontWeight: 950,
              letterSpacing: -1.5,
            }}
          >
            Agency Announcements
          </h1>

          <p
            style={{
              margin: "9px 0 0",
              maxWidth: 720,
              color:
                "rgba(247,241,232,0.42)",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Publish updates to everyone,
            creators, agents, or a specific
            agency. Website notifications are
            created automatically for the
            selected audience.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1fr)",
            gap: 22,
          }}
        >
          {/* CREATE */}
          <section
            style={{
              padding: 24,
              borderRadius: 24,
              border:
                "1px solid rgba(201,151,50,0.16)",
              background:
                "linear-gradient(145deg, rgba(18,15,15,0.94), rgba(5,5,5,0.98))",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#c99732",
                fontSize: 9,
                fontWeight: 950,
                letterSpacing: 2,
                textTransform:
                  "uppercase",
              }}
            >
              New Announcement
            </p>

            <h2
              style={{
                margin: "6px 0 0",
                fontSize: 22,
                fontWeight: 950,
              }}
            >
              Publish Update
            </h2>

           <form
  action={async (formData: FormData) => {
    "use server";

    await createAnnouncement(formData);
  }}
  style={{
    display: "grid",
    gap: 16,
  }}
>
              <label>
                <span style={labelStyle}>
                  Title
                </span>

                <input
                  name="title"
                  required
                  maxLength={150}
                  style={inputStyle}
                  placeholder="September Battle Update"
                />
              </label>

              <label>
                <span style={labelStyle}>
                  Message
                </span>

                <textarea
                  name="message"
                  required
                  maxLength={5000}
                  rows={7}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    lineHeight: 1.55,
                  }}
                  placeholder="Write the announcement..."
                />
              </label>

              <label>
                <span style={labelStyle}>
                  Audience
                </span>

                <select
                  name="audience"
                  defaultValue="everyone"
                  style={inputStyle}
                >
                  <option value="everyone">
                    Everyone
                  </option>

                  <option value="creators">
                    Creators Only
                  </option>

                  <option value="agents">
                    Agents Only
                  </option>

                  <option value="agency">
                    Specific Agency
                  </option>
                </select>
              </label>

              <label>
                <span style={labelStyle}>
                  Agency
                </span>

                <select
                  name="agency_id"
                  defaultValue=""
                  style={inputStyle}
                >
                  <option value="">
                    Select an agency if needed
                  </option>

                  {(agencies ?? []).map(
                    (agency) => (
                      <option
                        key={agency.id}
                        value={agency.id}
                      >
                        {agency.name}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span style={labelStyle}>
                  Link
                </span>

                <input
                  name="href"
                  style={inputStyle}
                  placeholder="/bloodline-arena/events"
                />
              </label>

              <div
                style={{
                  display: "flex",
                  gap: 18,
                  flexWrap: "wrap",
                }}
              >
                <label
                  style={checkLabelStyle}
                >
                  <input
                    type="checkbox"
                    name="send_notification"
                    defaultChecked
                  />

                  Send website notification
                </label>

                <label
                  style={checkLabelStyle}
                >
                  <input
                    type="checkbox"
                    name="send_discord"
                  />

                  Send Discord DM
                </label>
              </div>

              <button
                type="submit"
                style={{
                  marginTop: 4,
                  width: "fit-content",
                  cursor: "pointer",
                  padding: "12px 18px",
                  borderRadius: 999,
                  border:
                    "1px solid rgba(232,111,0,0.42)",
                  background:
                    "linear-gradient(180deg, rgba(232,111,0,0.22), rgba(76,18,0,0.28))",
                  color: "#e98322",
                  fontSize: 10,
                  fontWeight: 950,
                  textTransform:
                    "uppercase",
                }}
              >
                Publish Announcement
              </button>
            </form>
          </section>

          {/* HISTORY */}
          <section
            style={{
              overflow: "hidden",
              borderRadius: 24,
              border:
                "1px solid rgba(201,151,50,0.14)",
              background:
                "linear-gradient(145deg, rgba(18,15,15,0.94), rgba(5,5,5,0.98))",
            }}
          >
            <div
              style={{
                padding: "20px 22px",
                borderBottom:
                  "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#c99732",
                  fontSize: 9,
                  fontWeight: 950,
                  letterSpacing: 2,
                  textTransform:
                    "uppercase",
                }}
              >
                History
              </p>

              <h2
                style={{
                  margin: "6px 0 0",
                  fontSize: 20,
                  fontWeight: 950,
                }}
              >
                Recent Announcements
              </h2>
            </div>

            {!announcements ||
            announcements.length === 0 ? (
              <div
                style={{
                  padding: "60px 24px",
                  textAlign: "center",
                  color:
                    "rgba(247,241,232,0.38)",
                  fontSize: 12,
                }}
              >
                No announcements yet.
              </div>
            ) : (
              announcements.map(
                (announcement, index) => (
                  <div
                    key={announcement.id}
                    style={{
                      padding: "20px 22px",
                      borderTop:
                        index === 0
                          ? "none"
                          : "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "flex-start",
                        gap: 16,
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <div
                        style={{
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap:
                              "wrap",
                            alignItems:
                              "center",
                          }}
                        >
                          <span
                            style={badgeStyle}
                          >
                            {audienceLabel(
                              announcement.audience,
                              announcement.agency_id
                                ? agencyMap.get(
                                    announcement.agency_id
                                  )
                                : null
                            )}
                          </span>

                          {announcement.send_notification && (
                            <span
                              style={
                                badgeStyle
                              }
                            >
                              Website
                            </span>
                          )}

                          {announcement.send_discord && (
                            <span
                              style={
                                badgeStyle
                              }
                            >
                              Discord
                            </span>
                          )}
                        </div>

                        <h3
                          style={{
                            margin:
                              "10px 0 0",
                            fontSize: 17,
                            fontWeight: 950,
                          }}
                        >
                          {announcement.title}
                        </h3>

                        <p
                          style={{
                            margin:
                              "7px 0 0",
                            color:
                              "rgba(247,241,232,0.45)",
                            fontSize: 11,
                            lineHeight: 1.6,
                            whiteSpace:
                              "pre-wrap",
                          }}
                        >
                          {announcement.message}
                        </p>

                        {announcement.href && (
                          <p
                            style={{
                              margin:
                                "9px 0 0",
                              color:
                                "#d9b15c",
                              fontSize:
                                9,
                            }}
                          >
                            Link:{" "}
                            {announcement.href}
                          </p>
                        )}
                      </div>

                      <div
                        style={{
                          color:
                            "rgba(247,241,232,0.25)",
                          fontSize: 9,
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {formatDate(
                          announcement.published_at ||
                            announcement.created_at
                        )}
                      </div>
                    </div>
                  </div>
                )
              )
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: 7,
  color: "#d9b15c",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: 1.4,
  textTransform: "uppercase" as const,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  borderRadius: 14,
  border:
    "1px solid rgba(201,151,50,0.16)",
  background:
    "rgba(255,255,255,0.025)",
  color: "#f7f1e8",
  padding: "12px 13px",
  outline: "none",
  fontSize: 12,
};

const checkLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "rgba(247,241,232,0.62)",
  fontSize: 11,
};

const badgeStyle = {
  padding: "5px 8px",
  borderRadius: 999,
  border:
    "1px solid rgba(201,151,50,0.18)",
  background:
    "rgba(201,151,50,0.05)",
  color: "#d9b15c",
  fontSize: 8,
  fontWeight: 950,
  textTransform: "uppercase" as const,
};