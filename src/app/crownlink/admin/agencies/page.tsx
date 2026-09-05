import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import AddAgencyForm from "./AddAgencyForm";
import AgencyStatusButton from "./AgencyStatusButton";

export default async function CrownLinkAgenciesPage() {
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

  const { data: agencies, error } = await supabase
    .from("crownlink_agencies")
    .select("id, name, status, created_at")
    .order("name", { ascending: true });

  const totalAgencies = (agencies ?? []).length;

  const activeAgencies = (agencies ?? []).filter(
    (agency) => agency.status === "active"
  ).length;

  const inactiveAgencies = (agencies ?? []).filter(
    (agency) => agency.status !== "active"
  ).length;

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        color: "#f7f1e8",
        background: `
          radial-gradient(circle at 12% 4%, rgba(88,7,12,0.40), transparent 27%),
          radial-gradient(circle at 91% 32%, rgba(116,22,0,0.08), transparent 28%),
          linear-gradient(180deg, #080808 0%, #040404 48%, #010101 100%)
        `,
        padding: "28px 20px 70px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {/* BACK */}
        <div style={{ marginBottom: 16 }}>
          <Link
            href="/crownlink/admin"
            style={backButtonStyle}
          >
            <span style={{ fontSize: 14 }}>←</span>
            Admin Center
          </Link>
        </div>

        {/* HEADER */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "24px 27px",
            borderRadius: 24,
            border:
              "1px solid rgba(201,151,50,0.19)",
            background: `
              linear-gradient(
                130deg,
                rgba(48,5,9,0.90),
                rgba(14,10,10,0.95) 53%,
                rgba(3,3,3,0.98)
              )
            `,
            boxShadow:
              "0 22px 55px rgba(0,0,0,0.45)",
            marginBottom: 22,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 250,
              height: 250,
              borderRadius: "50%",
              background: "rgba(110,7,14,0.18)",
              filter: "blur(80px)",
              left: -100,
              top: -140,
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "5px 9px",
                borderRadius: 999,
                border:
                  "1px solid rgba(201,151,50,0.20)",
                background:
                  "rgba(201,151,50,0.045)",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#c99732",
                  boxShadow:
                    "0 0 8px rgba(201,151,50,0.55)",
                }}
              />

              <span style={eyebrowStyle}>
                Crown Link · People & Access
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                color: "#f9f4ed",
                fontSize: "clamp(30px,5vw,42px)",
                fontWeight: 950,
                letterSpacing: -1.4,
                lineHeight: 1,
              }}
            >
              Agencies
            </h1>

            <div
              style={{
                width: 58,
                height: 2,
                marginTop: 11,
                background:
                  "linear-gradient(90deg, #e86f00, #c99732, transparent)",
              }}
            />

            <p
              style={{
                margin: "10px 0 0",
                maxWidth: 680,
                color: "rgba(247,241,232,0.4)",
                fontSize: 11,
                lineHeight: 1.6,
              }}
            >
              Manage the approved agencies that can participate
              across the Crown Link network.
            </p>
          </div>
        </section>

        {/* SUMMARY */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 10,
            marginBottom: 22,
          }}
        >
          <SummaryCard
            value={totalAgencies}
            label="Total Agencies"
            icon="♛"
          />

          <SummaryCard
            value={activeAgencies}
            label="Active Agencies"
            icon="✓"
          />

          <SummaryCard
            value={inactiveAgencies}
            label="Inactive Agencies"
            icon="!"
          />
        </section>

        {/* ADD AGENCY */}
        <section
          style={{
            padding: 20,
            borderRadius: 19,
            border:
              "1px solid rgba(201,151,50,0.13)",
            background:
              "linear-gradient(145deg, rgba(20,16,16,0.94), rgba(5,5,5,0.97))",
            boxShadow:
              "0 18px 40px rgba(0,0,0,0.26)",
            marginBottom: 26,
          }}
        >
          <div
            style={{
              marginBottom: 17,
              paddingBottom: 14,
              borderBottom:
                "1px solid rgba(201,151,50,0.07)",
            }}
          >
            <p style={sectionEyebrowStyle}>
              Agency Setup
            </p>

            <h2
              style={{
                margin: "5px 0 0",
                color: "#f9f4ed",
                fontSize: 18,
                fontWeight: 950,
              }}
            >
              Add Agency
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                color: "rgba(247,241,232,0.28)",
                fontSize: 9,
                lineHeight: 1.5,
              }}
            >
              Add an approved agency to Crown Link.
              Agents and creators can then be assigned
              to it.
            </p>
          </div>

          <AddAgencyForm />
        </section>

        {/* AGENCY DIRECTORY */}
        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <div>
              <p style={sectionEyebrowStyle}>
                Agency Directory
              </p>

              <h2
                style={{
                  margin: "5px 0 0",
                  color: "#f9f4ed",
                  fontSize: 18,
                  fontWeight: 950,
                }}
              >
                Approved Agencies
              </h2>
            </div>

            {!error && totalAgencies > 0 && (
              <span style={countPillStyle}>
                {totalAgencies}{" "}
                {totalAgencies === 1
                  ? "agency"
                  : "agencies"}
              </span>
            )}
          </div>

          {error ? (
            <div style={errorStateStyle}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 11,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border:
                    "1px solid rgba(143,48,48,0.22)",
                  background:
                    "rgba(91,17,20,0.14)",
                  color: "#e89191",
                  fontWeight: 950,
                }}
              >
                !
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    color: "#f3b0b0",
                    fontSize: 11,
                    fontWeight: 900,
                  }}
                >
                  Unable to load agencies
                </p>

                <p
                  style={{
                    margin: "4px 0 0",
                    color:
                      "rgba(243,176,176,0.55)",
                    fontSize: 8,
                    overflowWrap: "anywhere",
                  }}
                >
                  {error.message}
                </p>
              </div>
            </div>
          ) : totalAgencies === 0 ? (
            <div style={emptyStateStyle}>
              <div style={emptyIconStyle}>
                ♛
              </div>

              <p
                style={{
                  margin: 0,
                  color: "#f9f4ed",
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                No agencies added yet
              </p>

              <p
                style={{
                  margin: "6px 0 0",
                  color:
                    "rgba(247,241,232,0.27)",
                  fontSize: 9,
                }}
              >
                Approved agencies will appear here
                after they are added.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              {(agencies ?? []).map((agency) => {
                const isActive =
                  agency.status === "active";

                return (
                  <article
                    key={agency.id}
                    style={{
                      position: "relative",
                      overflow: "hidden",
                      padding: 17,
                      borderRadius: 16,
                      border: isActive
                        ? "1px solid rgba(201,151,50,0.12)"
                        : "1px solid rgba(120,32,32,0.18)",
                      background: isActive
                        ? "linear-gradient(135deg, rgba(22,14,14,0.96), rgba(5,5,5,0.98))"
                        : "linear-gradient(135deg, rgba(38,10,12,0.45), rgba(5,5,5,0.98))",
                      boxShadow:
                        "0 12px 30px rgba(0,0,0,0.20)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                          "space-between",
                        gap: 18,
                        flexWrap: "wrap",
                      }}
                    >
                      {/* AGENCY IDENTITY */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border:
                              "1px solid rgba(201,151,50,0.14)",
                            background:
                              "rgba(201,151,50,0.04)",
                            color: "#d9b15c",
                            fontSize: 15,
                          }}
                        >
                          ♛
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <h3
                            style={{
                              margin: 0,
                              color: "#f9f4ed",
                              fontSize: 14,
                              fontWeight: 950,
                              overflow: "hidden",
                              textOverflow:
                                "ellipsis",
                            }}
                          >
                            {agency.name}
                          </h3>

                          <p
                            style={{
                              margin: "5px 0 0",
                              color:
                                "rgba(247,241,232,0.22)",
                              fontSize: 8,
                            }}
                          >
                            Added{" "}
                            {formatDate(
                              agency.created_at
                            )}
                          </p>
                        </div>
                      </div>

                      {/* STATUS / ACTION */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            "flex-end",
                          gap: 9,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={
                            isActive
                              ? activeStatusStyle
                              : inactiveStatusStyle
                          }
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: isActive
                                ? "#d9b15c"
                                : "#e89191",
                            }}
                          />

                          {agency.status}
                        </span>

                        <AgencyStatusButton
                          agencyId={agency.id}
                          currentStatus={
                            agency.status
                          }
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer
          style={{
            marginTop: 45,
            paddingTop: 17,
            borderTop:
              "1px solid rgba(201,151,50,0.08)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            color:
              "rgba(247,241,232,0.14)",
            fontSize: 8,
            fontWeight: 900,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          <span>Royals Bloodline</span>
          <span>
            Crown Link · Agency Management
          </span>
        </footer>
      </div>
    </main>
  );
}

function SummaryCard({
  value,
  label,
  icon,
}: {
  value: number | string;
  label: string;
  icon: string;
}) {
  return (
    <div
      style={{
        padding: "14px 15px",
        borderRadius: 14,
        border:
          "1px solid rgba(201,151,50,0.10)",
        background:
          "linear-gradient(145deg, rgba(18,13,13,0.91), rgba(5,5,5,0.96))",
        display: "flex",
        alignItems: "center",
        gap: 11,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border:
            "1px solid rgba(201,151,50,0.13)",
          background:
            "rgba(201,151,50,0.035)",
          color: "#c99732",
          fontSize: 10,
          fontWeight: 950,
        }}
      >
        {icon}
      </div>

      <div>
        <p
          style={{
            margin: 0,
            color: "#f9f4ed",
            fontSize: 17,
            fontWeight: 950,
            lineHeight: 1,
          }}
        >
          {value}
        </p>

        <p
          style={{
            margin: "5px 0 0",
            color:
              "rgba(247,241,232,0.25)",
            fontSize: 7,
            fontWeight: 900,
            letterSpacing: 0.7,
            textTransform: "uppercase",
          }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "#d9b15c",
  fontSize: 7,
  fontWeight: 950,
  letterSpacing: 1.8,
  textTransform: "uppercase" as const,
};

const sectionEyebrowStyle = {
  margin: 0,
  color: "#c99732",
  fontSize: 7,
  fontWeight: 950,
  letterSpacing: 1.9,
  textTransform: "uppercase" as const,
};

const backButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "7px 10px",
  borderRadius: 999,
  border:
    "1px solid rgba(201,151,50,0.13)",
  background: "rgba(0,0,0,0.28)",
  color: "#d9b15c",
  textDecoration: "none",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: 0.5,
  textTransform: "uppercase" as const,
};

const countPillStyle = {
  padding: "5px 8px",
  borderRadius: 999,
  border:
    "1px solid rgba(201,151,50,0.10)",
  background:
    "rgba(201,151,50,0.025)",
  color:
    "rgba(217,177,92,0.58)",
  fontSize: 7,
  fontWeight: 950,
  textTransform: "uppercase" as const,
  letterSpacing: 0.6,
};

const activeStatusStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 8px",
  borderRadius: 999,
  border:
    "1px solid rgba(201,151,50,0.14)",
  background:
    "rgba(201,151,50,0.035)",
  color: "#d9b15c",
  fontSize: 6,
  fontWeight: 950,
  letterSpacing: 0.7,
  textTransform: "uppercase" as const,
};

const inactiveStatusStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 8px",
  borderRadius: 999,
  border:
    "1px solid rgba(143,48,48,0.20)",
  background:
    "rgba(91,17,20,0.12)",
  color: "#e89191",
  fontSize: 6,
  fontWeight: 950,
  letterSpacing: 0.7,
  textTransform: "uppercase" as const,
};

const errorStateStyle = {
  padding: "16px",
  borderRadius: 15,
  border:
    "1px solid rgba(143,48,48,0.20)",
  background:
    "rgba(91,17,20,0.10)",
  display: "flex",
  alignItems: "center",
  gap: 11,
};

const emptyStateStyle = {
  padding: "30px 22px",
  borderRadius: 18,
  border:
    "1px dashed rgba(201,151,50,0.14)",
  background: "rgba(10,8,8,0.72)",
  textAlign: "center" as const,
};

const emptyIconStyle = {
  width: 34,
  height: 34,
  margin: "0 auto 10px",
  borderRadius: 11,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border:
    "1px solid rgba(201,151,50,0.14)",
  background:
    "rgba(201,151,50,0.035)",
  color: "#c99732",
  fontSize: 14,
};