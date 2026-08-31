"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type HistoryPoint = {
  imported_at: string;
  diamonds: number | null;
  live_days: number | null;
  live_duration: number | null;
  matches: number | null;
};

type Props = {
  history: HistoryPoint[];
};

function shortDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function fullDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function CreatorTrendCharts({
  history,
}: Props) {
  const chartData = [...history]
    .sort(
      (a, b) =>
        new Date(a.imported_at).getTime() -
        new Date(b.imported_at).getTime()
    )
    .map((snapshot) => ({
      imported_at: snapshot.imported_at,
      date: shortDate(snapshot.imported_at),

      diamonds: Number(
        snapshot.diamonds ?? 0
      ),

      live_days: Number(
        snapshot.live_days ?? 0
      ),

      live_hours: Number(
        snapshot.live_duration ?? 0
      ),

      matches: Number(
        snapshot.matches ?? 0
      ),
    }));

  if (chartData.length < 2) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold">
          Performance Trends
        </h2>

        <p className="mt-2 text-sm text-gray-400">
          At least two Backstage imports are needed before trend charts can be shown.
        </p>
      </div>
    );
  }

  const tooltipStyle = {
    backgroundColor: "#090909",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: "12px",
    color: "#ffffff",
  };

  return (
    <div>
      <div>
        <h2 className="text-xl font-bold">
          Performance Trends
        </h2>

        <p className="mt-1 text-sm text-gray-400">
          Performance across saved Backstage imports.
        </p>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {/* DIAMONDS */}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div>
            <p className="text-sm text-gray-400">
              Diamonds
            </p>

            <p className="mt-1 text-xs text-gray-600">
              Total diamonds recorded at each import
            </p>
          </div>

          <div className="mt-5 h-[300px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 15,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,.08)"
                />

                <XAxis
                  dataKey="date"
                  stroke="#737373"
                  tick={{
                    fill: "#a3a3a3",
                    fontSize: 12,
                  }}
                />

                <YAxis
                  stroke="#737373"
                  tick={{
                    fill: "#a3a3a3",
                    fontSize: 12,
                  }}
                  tickFormatter={(value) =>
                    Number(value).toLocaleString()
                  }
                />

                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(_, payload) => {
                    const item =
                      payload?.[0]?.payload;

                    return item
                      ? fullDate(
                          item.imported_at
                        )
                      : "";
                  }}
                  formatter={(value) => [
                    Number(
                      value ?? 0
                    ).toLocaleString(),
                    "Diamonds",
                  ]}
                />

                <Line
                  type="monotone"
                  dataKey="diamonds"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: "#ef4444",
                  }}
                  activeDot={{
                    r: 6,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MATCHES */}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div>
            <p className="text-sm text-gray-400">
              Matches
            </p>

            <p className="mt-1 text-xs text-gray-600">
              Match activity across imports
            </p>
          </div>

          <div className="mt-5 h-[300px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 15,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,.08)"
                />

                <XAxis
                  dataKey="date"
                  stroke="#737373"
                  tick={{
                    fill: "#a3a3a3",
                    fontSize: 12,
                  }}
                />

                <YAxis
                  stroke="#737373"
                  tick={{
                    fill: "#a3a3a3",
                    fontSize: 12,
                  }}
                />

                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(_, payload) => {
                    const item =
                      payload?.[0]?.payload;

                    return item
                      ? fullDate(
                          item.imported_at
                        )
                      : "";
                  }}
                  formatter={(value) => [
                    Number(
                      value ?? 0
                    ).toLocaleString(),
                    "Matches",
                  ]}
                />

                <Line
                  type="monotone"
                  dataKey="matches"
                  stroke="#a855f7"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: "#a855f7",
                  }}
                  activeDot={{
                    r: 6,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DAYS */}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div>
            <p className="text-sm text-gray-400">
              Valid LIVE Days
            </p>

            <p className="mt-1 text-xs text-gray-600">
              Progress toward the 12-day requirement
            </p>
          </div>

          <div className="mt-5 h-[300px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 15,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,.08)"
                />

                <XAxis
                  dataKey="date"
                  stroke="#737373"
                  tick={{
                    fill: "#a3a3a3",
                    fontSize: 12,
                  }}
                />

                <YAxis
                  stroke="#737373"
                  tick={{
                    fill: "#a3a3a3",
                    fontSize: 12,
                  }}
                />

                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(_, payload) => {
                    const item =
                      payload?.[0]?.payload;

                    return item
                      ? fullDate(
                          item.imported_at
                        )
                      : "";
                  }}
                  formatter={(value) => [
                    Number(
                      value ?? 0
                    ).toLocaleString(),
                    "LIVE Days",
                  ]}
                />

                <Line
                  type="monotone"
                  dataKey="live_days"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: "#22c55e",
                  }}
                  activeDot={{
                    r: 6,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* HOURS */}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div>
            <p className="text-sm text-gray-400">
              LIVE Hours
            </p>

            <p className="mt-1 text-xs text-gray-600">
              Progress toward the 25-hour requirement
            </p>
          </div>

          <div className="mt-5 h-[300px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 15,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,.08)"
                />

                <XAxis
                  dataKey="date"
                  stroke="#737373"
                  tick={{
                    fill: "#a3a3a3",
                    fontSize: 12,
                  }}
                />

                <YAxis
                  stroke="#737373"
                  tick={{
                    fill: "#a3a3a3",
                    fontSize: 12,
                  }}
                  tickFormatter={(value) =>
                    Number(value).toFixed(0)
                  }
                />

                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(_, payload) => {
                    const item =
                      payload?.[0]?.payload;

                    return item
                      ? fullDate(
                          item.imported_at
                        )
                      : "";
                  }}
                  formatter={(value) => [
                    Number(
                      value ?? 0
                    ).toFixed(2),
                    "LIVE Hours",
                  ]}
                />

                <Line
                  type="monotone"
                  dataKey="live_hours"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: "#f59e0b",
                  }}
                  activeDot={{
                    r: 6,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}