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

function euro(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function compactEuro(value) {
  const amount = Number(value) || 0;

  if (Math.abs(amount) >= 1_000_000) {
    return `€${(amount / 1_000_000).toFixed(1)}M`;
  }

  if (Math.abs(amount) >= 1_000) {
    return `€${Math.round(amount / 1_000)}k`;
  }

  return `€${Math.round(amount)}`;
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

function ChartTooltip({ formatter }) {
  return (
    <Tooltip
      formatter={formatter}
      contentStyle={{
        background: "#020617",
        border: "1px solid rgba(148,163,184,.25)",
        borderRadius: 14,
      }}
    />
  );
}

function CashOutChart({ cashOut }) {
  const monthly = cashOut?.monthly || [];
  const eventCount = Number(cashOut?.eventCount || 0);

  return (
    <section className="dashboard-card cash-out-card">
      <CardHead
        eyebrow="Financial Control"
        title="Monthly Cash Out"
        action={`${eventCount} CASH EVENTS`}
      />

      {monthly.length === 0 ? (
        <div className="dashboard-empty-state">
          <strong>No Cash Flow data available</strong>
          <span>
            Import the project payment schedule to display
            monthly cash out.
          </span>
        </div>
      ) : (
        <div className="chart-box xl">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthly}
              margin={{
                top: 18,
                right: 18,
                left: 12,
                bottom: 4,
              }}
            >
              <CartesianGrid
                stroke="rgba(148,163,184,.12)"
                vertical={false}
              />

              <XAxis
                dataKey="month"
                stroke="#94a3b8"
              />

              <YAxis
                stroke="#94a3b8"
                tickFormatter={compactEuro}
                width={72}
              />

              <ChartTooltip
                formatter={(value) => [
                  euro(value),
                  "Cash Out",
                ]}
              />

              <Bar
                dataKey="amount"
                name="Cash Out"
                fill="#38bdf8"
                radius={[10, 10, 0, 0]}
                maxBarSize={72}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
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

      <CashOutChart cashOut={dashboard.cashOut} />

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
