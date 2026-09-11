"use client";

import { useMemo, useState } from "react";

export type DashboardAlert = {
  id: string;
  type: "danger" | "warning" | "success" | "info";
  title: string;
  message: string;
};

type Props = {
  alerts: DashboardAlert[];
};

function getStyles(type: DashboardAlert["type"]) {
  switch (type) {
    case "danger":
      return {
        wrapper: "border-red-500/30 bg-red-500/10",
        title: "text-red-300",
        badge: "bg-red-500/20 text-red-200",
        label: "Alert",
      };

    case "warning":
      return {
        wrapper: "border-orange-500/30 bg-orange-500/10",
        title: "text-orange-300",
        badge: "bg-orange-500/20 text-orange-200",
        label: "Watch",
      };

    case "success":
      return {
        wrapper: "border-green-500/30 bg-green-500/10",
        title: "text-green-300",
        badge: "bg-green-500/20 text-green-200",
        label: "Positive",
      };

    default:
      return {
        wrapper: "border-blue-500/30 bg-blue-500/10",
        title: "text-blue-300",
        badge: "bg-blue-500/20 text-blue-200",
        label: "Info",
      };
  }
}

export default function DashboardAlerts({ alerts }: Props) {
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  const visibleAlerts = useMemo(() => {
    return alerts.filter(
      (alert) => !dismissedAlertIds.includes(alert.id)
    );
  }, [alerts, dismissedAlertIds]);

  function dismissAlert(alertId: string) {
    setDismissedAlertIds((current) => {
      if (current.includes(alertId)) {
        return current;
      }

      return [...current, alertId];
    });
  }

  function clearAllAlerts() {
    setDismissedAlertIds(alerts.map((alert) => alert.id));
  }

  const dangerCount = visibleAlerts.filter(
    (alert) => alert.type === "danger"
  ).length;

  const warningCount = visibleAlerts.filter(
    (alert) => alert.type === "warning"
  ).length;

  const successCount = visibleAlerts.filter(
    (alert) => alert.type === "success"
  ).length;

  const infoCount = visibleAlerts.filter(
    (alert) => alert.type === "info"
  ).length;

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

  if (visibleAlerts.length === 0) {
    return (
      <section className="mt-8">
        <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-gray-400">
                Dashboard Alerts
              </p>

              <h2 className="mt-2 text-xl font-bold text-white">
                Alerts cleared
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                You dismissed all alerts for this session.
              </p>
            </div>

            <div className="rounded-xl border border-gray-700 bg-black/20 px-4 py-2 text-sm font-semibold text-gray-300">
              Cleared
            </div>
          </div>
        </div>
      </section>
    );
  }

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

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {dangerCount > 0 && (
            <div className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-red-300">
              {dangerCount} {dangerCount === 1 ? "Alert" : "Alerts"}
            </div>
          )}

          {warningCount > 0 && (
            <div className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-orange-300">
              {warningCount} {warningCount === 1 ? "Watch" : "Watches"}
            </div>
          )}

          {successCount > 0 && (
            <div className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-green-300">
              {successCount} {successCount === 1 ? "Positive" : "Positives"}
            </div>
          )}

          {infoCount > 0 && (
            <div className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-blue-300">
              {infoCount} {infoCount === 1 ? "Info" : "Info"}
            </div>
          )}

          <button
            type="button"
            onClick={clearAllAlerts}
            className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1.5 text-gray-300 transition hover:border-gray-500 hover:bg-gray-800 hover:text-white"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {visibleAlerts.map((alert) => {
          const styles = getStyles(alert.type);

          return (
            <div
              key={alert.id}
              className={`relative rounded-2xl border p-5 pr-12 ${styles.wrapper}`}
            >
              <button
                type="button"
                onClick={() => dismissAlert(alert.id)}
                aria-label={`Dismiss ${alert.title}`}
                title="Dismiss alert"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-lg text-gray-400 transition hover:bg-white/10 hover:text-white"
              >
                ×
              </button>

              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className={`font-semibold ${styles.title}`}>
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