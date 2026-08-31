"use client";

export type DashboardAlert = {
  id: string;
  type: "danger" | "warning" | "success" | "info";
  title: string;
  message: string;
};

type Props = {
  alerts: DashboardAlert[];
};

function getStyles(
  type: DashboardAlert["type"]
) {
  switch (type) {
    case "danger":
      return {
        wrapper:
          "border-red-500/30 bg-red-500/10",
        title:
          "text-red-300",
        badge:
          "bg-red-500/20 text-red-200",
        label:
          "Alert",
      };

    case "warning":
      return {
        wrapper:
          "border-orange-500/30 bg-orange-500/10",
        title:
          "text-orange-300",
        badge:
          "bg-orange-500/20 text-orange-200",
        label:
          "Watch",
      };

    case "success":
      return {
        wrapper:
          "border-green-500/30 bg-green-500/10",
        title:
          "text-green-300",
        badge:
          "bg-green-500/20 text-green-200",
        label:
          "Positive",
      };

    default:
      return {
        wrapper:
          "border-blue-500/30 bg-blue-500/10",
        title:
          "text-blue-300",
        badge:
          "bg-blue-500/20 text-blue-200",
        label:
          "Info",
      };
  }
}

export default function DashboardAlerts({
  alerts,
}: Props) {
  if (alerts.length === 0) {
    return (
      <section className="mt-8">
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-green-400">
                Dashboard Alerts
              </p>

              <h2 className="mt-2 text-xl font-bold text-white">
                Nothing major needs attention
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                No significant performance alerts were detected in the current report.
              </p>
            </div>

            <div className="rounded-xl bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-300">
              All Clear
            </div>
          </div>
        </div>
      </section>
    );
  }

  const dangerCount =
    alerts.filter(
      (alert) =>
        alert.type === "danger"
    ).length;

  const warningCount =
    alerts.filter(
      (alert) =>
        alert.type === "warning"
    ).length;

  const successCount =
    alerts.filter(
      (alert) =>
        alert.type === "success"
    ).length;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-red-500">
            Dashboard Alerts
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            Performance Watch
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Automatic callouts based on the current Backstage report.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {dangerCount > 0 && (
            <div className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-red-300">
              {dangerCount}{" "}
              {dangerCount === 1
                ? "Alert"
                : "Alerts"}
            </div>
          )}

          {warningCount > 0 && (
            <div className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-orange-300">
              {warningCount}{" "}
              {warningCount === 1
                ? "Watch"
                : "Watches"}
            </div>
          )}

          {successCount > 0 && (
            <div className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-green-300">
              {successCount}{" "}
              {successCount === 1
                ? "Positive"
                : "Positives"}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {alerts.map((alert) => {
          const styles =
            getStyles(alert.type);

          return (
            <div
              key={alert.id}
              className={`rounded-2xl border p-5 ${styles.wrapper}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3
                    className={`font-semibold ${styles.title}`}
                  >
                    {alert.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-300">
                    {alert.message}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${styles.badge}`}
                >
                  {styles.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}