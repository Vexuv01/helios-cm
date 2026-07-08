import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "../../styles/construction-workspace.css";

function getWeekRange(date = new Date()) {
  const current = new Date(date);
  const day = current.getDay();
  const diffToMonday = current.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(current.setDate(diffToMonday));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: friday.toISOString().slice(0, 10),
  };
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percent(actual, baseline) {
  if (toNumber(baseline) <= 0) return 0;
  return Math.min((toNumber(actual) / toNumber(baseline)) * 100, 100);
}

function getEntryQty(entry) {
  return toNumber(
    entry.actual_quantity ??
      entry.installed_quantity ??
      entry.produced_quantity ??
      entry.quantity ??
      entry.qty ??
      0
  );
}

function getEntryActivityId(entry) {
  return entry.wbs_activity_id || entry.activity_id || entry.wbs_id;
}

export default function ProjectWeekly() {
  const params = useParams();
  const routeProjectId = params.projectId || params.id;
  const week = useMemo(() => getWeekRange(), []);

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(routeProjectId || "");
  const [report, setReport] = useState(null);
  const [activities, setActivities] = useState([]);
  const [weeklyValues, setWeeklyValues] = useState({});
  const [cumulativeValues, setCumulativeValues] = useState({});
  const [search, setSearch] = useState("");
  const [discipline, setDiscipline] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const operationalActivities = useMemo(
    () => activities.filter((activity) => activity.is_group !== true),
    [activities]
  );

  const disciplines = useMemo(
    () => [...new Set(operationalActivities.map((activity) => activity.discipline).filter(Boolean))],
    [operationalActivities]
  );

  const visibleActivities = useMemo(() => {
    return operationalActivities.filter((activity) => {
      const term = search.toLowerCase();
      const matchSearch =
        !search ||
        String(activity.code || "").toLowerCase().includes(term) ||
        String(activity.name || "").toLowerCase().includes(term);

      const matchDiscipline = discipline === "all" || activity.discipline === discipline;

      return matchSearch && matchDiscipline;
    });
  }, [discipline, operationalActivities, search]);

  const weeklyTotal = useMemo(
    () => Object.values(weeklyValues).reduce((sum, value) => sum + toNumber(value), 0),
    [weeklyValues]
  );

  const activeRows = useMemo(
    () => Object.values(weeklyValues).filter((value) => toNumber(value) !== 0).length,
    [weeklyValues]
  );

  const loadWeekly = useCallback(
    async (targetProjectId = projectId) => {
      setLoading(true);

      const { data: projectRows, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("code", { ascending: true });

      if (projectsError) alert(projectsError.message);

      const nextProjects = projectRows || [];
      const nextProjectId = targetProjectId || routeProjectId || nextProjects[0]?.id || "";

      setProjects(nextProjects);
      setProjectId(nextProjectId);

      if (!nextProjectId) {
        setActivities([]);
        setLoading(false);
        return;
      }

      const { data: wbsRows, error: wbsError } = await supabase
        .from("wbs_activities")
        .select("*")
        .eq("project_id", nextProjectId)
        .order("sort_order", { ascending: true })
        .order("code", { ascending: true });

      if (wbsError) alert(wbsError.message);

      const { data: reports, error: reportsError } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("project_id", nextProjectId)
        .order("week_start", { ascending: true });

      if (reportsError) alert(reportsError.message);

      const currentReport =
        (reports || []).find((item) => item.week_start === week.weekStart) || null;

      const reportIds = (reports || []).map((item) => item.id);
      let entries = [];

      if (reportIds.length > 0) {
        const { data: entryRows, error: entriesError } = await supabase
          .from("weekly_entries")
          .select("*")
          .in("weekly_report_id", reportIds);

        if (entriesError) alert(entriesError.message);
        entries = entryRows || [];
      }

      const currentValues = {};
      const cumulative = {};

      entries.forEach((entry) => {
        const activityId = getEntryActivityId(entry);
        if (!activityId) return;

        const relatedReport = (reports || []).find((item) => item.id === entry.weekly_report_id);
        const qty = getEntryQty(entry);

        if (relatedReport?.id === currentReport?.id) {
          currentValues[activityId] = qty;
        }

        const status = String(relatedReport?.status || "").toUpperCase();
        const isApprovedActual = ["SUBMITTED", "VALIDATED", "APPROVED"].includes(status);

        if (isApprovedActual) {
          cumulative[activityId] = toNumber(cumulative[activityId]) + qty;
        }
      });

      setReport(currentReport);
      setActivities(wbsRows || []);
      setWeeklyValues(currentValues);
      setCumulativeValues(cumulative);
      setLoading(false);
    },
    [projectId, routeProjectId, week.weekStart]
  );

  useEffect(() => {
    loadWeekly();
  }, [loadWeekly]);

  async function ensureReport(status = "draft") {
    const { data, error } = await supabase
      .from("weekly_reports")
      .upsert(
        {
          project_id: projectId,
          week_start: week.weekStart,
          week_end: week.weekEnd,
          status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id,week_start" }
      )
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async function saveWeekly(nextStatus = "draft") {
    setSaving(true);

    try {
      const savedReport = await ensureReport(nextStatus);

      const payload = Object.entries(weeklyValues)
        .filter(([, value]) => toNumber(value) !== 0)
        .map(([activityId, value]) => ({
          project_id: projectId,
          weekly_report_id: savedReport.id,
          activity_id: activityId,
          wbs_activity_id: activityId,
          actual_quantity: toNumber(value),
          updated_at: new Date().toISOString(),
        }));

      if (payload.length > 0) {
        const { error } = await supabase
          .from("weekly_entries")
          .upsert(payload, { onConflict: "weekly_report_id,wbs_activity_id" });

        if (error) throw new Error(error.message);
      }

      await loadWeekly(projectId);
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitWeekly() {
    if (weeklyTotal <= 0) {
      alert("Inserisci almeno una quantità prima del submit.");
      return;
    }

    const confirmed = window.confirm("Confermi il submit della Weekly all'IPP/DL?");
    if (!confirmed) return;

    await saveWeekly("SUBMITTED");
  }

  return (
    <main className="construction-workspace">
      <header className="cw-workspace-header">
        <div>
          <span>EPC Production Area</span>
          <h1>Weekly Production</h1>
          <p>Inserisci solo le quantità prodotte. Baseline e pesi sono in sola lettura.</p>
        </div>

        <div className="cw-project-select">
          <label>Project</label>
          <select
            value={projectId}
            onChange={(event) => {
              const nextProjectId = event.target.value;
              setProjectId(nextProjectId);
              loadWeekly(nextProjectId);
            }}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} · {project.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <section className="cw-metrics">
        <div>
          <span>Week</span>
          <strong>{week.weekStart} / {week.weekEnd}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{report?.status || "draft"}</strong>
        </div>
        <div>
          <span>Activities</span>
          <strong>{operationalActivities.length}</strong>
        </div>
        <div>
          <span>Rows Updated</span>
          <strong>{activeRows}</strong>
        </div>
        <div>
          <span>Weekly Qty</span>
          <strong>{weeklyTotal}</strong>
        </div>
      </section>

      <section className="cw-save-bar">
        <div>
          <strong>Weekly reale da WBS attività</strong>
          <span>Actual Progress della Control Room userà solo Weekly submitted / validated / approved.</span>
        </div>

        <div className="weekly-actions">
          <button type="button" onClick={() => saveWeekly("draft")} disabled={saving}>
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button type="button" className="cw-secondary-action" onClick={submitWeekly} disabled={saving}>
            Submit Weekly
          </button>
        </div>
      </section>

      <section className="cw-toolbar weekly-toolbar">
        <input
          placeholder="Search production activity..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select value={discipline} onChange={(event) => setDiscipline(event.target.value)}>
          <option value="all">All disciplines</option>
          {disciplines.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </section>

      <section className="cw-grid-shell">
        {loading ? (
          <div className="cw-empty">Loading Weekly...</div>
        ) : (
          <table className="cw-grid cw-weekly-grid">
            <thead>
              <tr>
                <th>Code</th>
                <th>Activity</th>
                <th>Discipline</th>
                <th>U.M.</th>
                <th>Baseline</th>
                <th>Cumulative</th>
                <th>This Week</th>
                <th>Progress</th>
              </tr>
            </thead>

            <tbody>
              {visibleActivities.map((activity) => {
                const cumulative = toNumber(cumulativeValues[activity.id]);
                const weeklyQty = toNumber(weeklyValues[activity.id]);
                const projected = cumulative + weeklyQty;
                const progress = percent(projected, activity.baseline_quantity);

                return (
                  <tr key={activity.id}>
                    <td>{activity.code}</td>
                    <td className="cw-activity-readonly">{activity.name}</td>
                    <td>{activity.discipline}</td>
                    <td>{activity.unit}</td>
                    <td>{activity.baseline_quantity}</td>
                    <td>{cumulative}</td>
                    <td>
                      <input
                        className="cw-weekly-input"
                        type="number"
                        min="0"
                        value={weeklyValues[activity.id] ?? ""}
                        onChange={(event) =>
                          setWeeklyValues((current) => ({
                            ...current,
                            [activity.id]: event.target.value,
                          }))
                        }
                      />
                    </td>
                    <td className="cw-progress-cell">
                      <span>{progress.toFixed(1)}%</span>
                      <div><i style={{ width: `${progress}%` }} /></div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
