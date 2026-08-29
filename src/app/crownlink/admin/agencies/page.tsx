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
            Agencies
          </h1>

          <p
            style={{
              marginTop: 10,
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Approved agencies with access to Crown Link.
          </p>
        </div>
        <AddAgencyForm />

        {error ? (
          <div
            style={{
              padding: 18,
              borderRadius: 14,
              border: "1px solid rgba(255,80,80,0.3)",
              background: "rgba(255,60,60,0.08)",
              color: "#ffaaaa",
            }}
          >
            Error loading agencies: {error.message}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 14,
            }}
          >
            {(agencies ?? []).length === 0 ? (
              <div
                style={{
                  padding: 24,
                  borderRadius: 16,
                  border: "1px solid rgba(211,163,60,0.2)",
                  background: "rgba(20,10,10,0.75)",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                No agencies have been added yet.
              </div>
            ) : (
              (agencies ?? []).map((agency) => (
                <div
                  key={agency.id}
                  style={{
                    padding: 20,
                    borderRadius: 16,
                    border: "1px solid rgba(211,163,60,0.2)",
                    background: "rgba(20,10,10,0.75)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 20,
                        fontWeight: 900,
                      }}
                    >
                      {agency.name}
                    </h2>

                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 13,
                        color: "rgba(255,255,255,0.45)",
                      }}
                    >
                      Added{" "}
                      {new Date(
                        agency.created_at
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 12,
  }}
>
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "7px 12px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 800,
      textTransform: "uppercase",
      letterSpacing: 1,
      color:
        agency.status === "active"
          ? "#b8f5c2"
          : "#ffb0b0",
      background:
        agency.status === "active"
          ? "rgba(60,180,90,0.12)"
          : "rgba(255,70,70,0.1)",
      border:
        agency.status === "active"
          ? "1px solid rgba(80,210,110,0.25)"
          : "1px solid rgba(255,80,80,0.25)",
    }}
  >
    {agency.status}
  </span>

  <AgencyStatusButton
    agencyId={agency.id}
    currentStatus={agency.status}
  />
</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}