import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = [
  "#38bdf8",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
];

function stateLabel(gap) {
  return Number(gap || 0) >= 0
    ? "ON / AHEAD"
    : "BEHIND PLAN";
}

function CardHead({ eyebrow, title, action }) {
  return (
    <div className="dashboard-card-head">
      <div>
        <span>{eyebrow}</span>
        <strong>{title}</strong>
      </div>

      {action ? <b>{action}</b> : null}
    </div>
  );
}

function ChartTooltip() {
  return (
    <Tooltip
      contentStyle={{
        background: "#020617",
        border: "1px solid rgba(148,163,184,.25)",
        borderRadius: 14,
      }}
    />
  );
}

export default function DashboardCharts({ dashboard }) {
  return (
    <>
      <section className="dashboard-card s-curve-card">
        <CardHead
          eyebrow="S-Curve"
          title="Planned WBS vs Weekly Actual"
          action={stateLabel(dashboard.scheduleGap)}
        />

        <div className="chart-box xl s-curve-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dashboard.curve}>
              <CartesianGrid
                stroke="rgba(148,163,184,.12)"
                vertical={false}
              />

              <XAxis
                dataKey="week"
                stroke="#94a3b8"
              />

              <YAxis
                stroke="#94a3b8"
                domain={[0, 100]}
              />

              <ChartTooltip />

              <Area
                type="monotone"
                dataKey="planned"
                name="Planned"
                stroke="#38bdf8"
                fill="#38bdf833"
                strokeWidth={3}
              />

              <Area
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke="#22c55e"
                fill="#22c55e33"
                strokeWidth={3}
              />

              {dashboard.hasRecoveryForecast ? (
                <Area
                  type="monotone"
                  dataKey="forecast"
                  name="Recovery Forecast"
                  stroke="#f59e0b"
                  fill="#f59e0b22"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                />
              ) : null}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="dashboard-grid analytics-grid">
        <div className="dashboard-card">
          <CardHead
            eyebrow="Discipline"
            title="Actual Progress"
          />

          <div className="chart-box">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={dashboard.disciplines}
                layout="vertical"
              >
                <CartesianGrid
                  stroke="rgba(148,163,184,.12)"
                  horizontal={false}
                />

                <XAxis
                  type="number"
                  domain={[0, 100]}
                  stroke="#94a3b8"
                />

                <YAxis
                  type="category"
                  dataKey="discipline"
                  stroke="#94a3b8"
                  width={105}
                />

                <ChartTooltip />

                <Bar
                  dataKey="progress"
                  name="Actual %"
                  radius={[0, 10, 10, 0]}
                >
                  {dashboard.disciplines.map(
                    (entry, index) => (
                      <Cell
                        key={entry.discipline}
                        fill={
                          COLORS[
                            index % COLORS.length
                          ]
                        }
                      />
                    )
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dashboard-card weight-summary-card">
          <CardHead
            eyebrow="Weight"
            title="Distribution"
          />

          <div className="weight-list-only">
            {dashboard.weightDistribution.map(
              (entry, index) => (
                <div
                  className="weight-summary-row"
                  key={entry.discipline}
                >
                  <span
                    className="weight-summary-indicator"
                    style={{
                      background:
                        COLORS[
                          index % COLORS.length
                        ],
                    }}
                  />

                  <div className="weight-summary-copy">
                    <strong>{entry.discipline}</strong>
                    <span>
                      Baseline weight allocation
                    </span>
                  </div>

                  <b>
                    {Number(entry.value).toFixed(1)}%
                  </b>
                </div>
              )
            )}
          </div>
        </div>
      </section>
    </>
  );
}
