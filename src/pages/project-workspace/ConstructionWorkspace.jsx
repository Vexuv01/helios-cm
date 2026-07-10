import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { importWbsExcelFile } from "../../features/wbs/import/excelImporter";
import { buildWbsWeightModel } from "../../services/wbsWeightEngine";
import "../../styles/construction-workspace.css";

const DEFAULT_CATEGORIES = [
  "ENGINEERING",
  "PROCUREMENT",
  "CIVIL",
  "MECHANICAL",
  "ELECTRICAL",
  "GRID_CONNECTION",
  "COMMISSIONING",
];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanActivity(activity) {
  return {
    parent_id: null,
    code: activity.code || "",
    name: activity.name || "",
    discipline: activity.discipline || "GENERAL",
    unit: activity.unit || "unit",
    baseline_quantity: toNumber(activity.baseline_quantity),
    weight_percent: toNumber(activity.weight_percent),
    planned_start: activity.planned_start || null,
    planned_finish: activity.planned_finish || null,
    status: activity.status || "not_started",
    is_group: false,
    level: 3,
    sort_order: toNumber(activity.sort_order),
    updated_at: new Date().toISOString(),
  };
}

export default function ConstructionWorkspace() {
  const params = useParams();
  const routeProjectId = params.projectId || params.id;

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(routeProjectId || "");
  const [activities, setActivities] = useState([]);
  const [dirtyIds, setDirtyIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const excelInputRef = useRef(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [newActivityCategory] = useState("GENERAL");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [templateProjectId, setTemplateProjectId] = useState("");

  const weightedModel = useMemo(() => buildWbsWeightModel(activities), [activities]);

  const baselineActivities = useMemo(
    () => weightedModel.rows.filter((activity) => activity.is_leaf),
    [weightedModel.rows]
  );

  const categories = useMemo(() => {
    const fromData = baselineActivities
      .map((activity) => String(activity.discipline || "").trim().toUpperCase())
      .filter(Boolean);

    return [...new Set([...DEFAULT_CATEGORIES, ...fromData])];
  }, [baselineActivities]);

  const visibleActivities = useMemo(() => {
    return baselineActivities.filter((activity) => {
      const term = search.toLowerCase();
      const matchSearch =
        !search ||
        String(activity.code || "").toLowerCase().includes(term) ||
        String(activity.name || "").toLowerCase().includes(term) ||
        String(activity.discipline || "").toLowerCase().includes(term);

      const matchCategory = category === "all" || activity.discipline === category;

      return matchSearch && matchCategory;
    });
  }, [baselineActivities, category, search]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projects, projectId]
  );

  const metrics = useMemo(() => {
    const totalWeight = baselineActivities.reduce(
      (sum, item) => sum + toNumber(item.weight_percent),
      0
    );

    const totalQty = baselineActivities.reduce(
      (sum, item) => sum + toNumber(item.baseline_quantity),
      0
    );

    const missingDates = baselineActivities.filter(
      (item) => !item.planned_start || !item.planned_finish
    ).length;

    return {
      activities: baselineActivities.length,
      totalWeight: Number(totalWeight.toFixed(2)),
      totalQty,
      validWeight: Math.abs(totalWeight - 100) < 0.01,
      missingDates,
    };
  }, [baselineActivities]);

  const loadWorkspace = useCallback(
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

      if (!templateProjectId) {
        setTemplateProjectId(nextProjects.find((project) => project.id !== nextProjectId)?.id || "");
      }

      if (!nextProjectId) {
        setActivities([]);
        setDirtyIds(new Set());
        setSelectedIds(new Set());
        setLoading(false);
        return;
      }

      const { data: wbsRows, error } = await supabase
        .from("wbs_activities")
        .select("*")
        .eq("project_id", nextProjectId)
        .order("sort_order", { ascending: true })
        .order("code", { ascending: true });

      if (error) alert(error.message);

      setActivities(wbsRows || []);
      setDirtyIds(new Set());
      setLoading(false);
    },
    [projectId, routeProjectId, templateProjectId]
  );

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  function toggleSelected(activityId) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(activityId)) next.delete(activityId);
      else next.add(activityId);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      const visibleIds = visibleActivities.map((activity) => activity.id);
      const allSelected = visibleIds.every((id) => current.has(id));

      if (allSelected) {
        return new Set([...current].filter((id) => !visibleIds.includes(id)));
      }

      return new Set([...current, ...visibleIds]);
    });
  }

  function updateActivity(activityId, field, value) {
    setActivities((current) =>
      current.map((activity) =>
        activity.id === activityId ? { ...activity, [field]: value } : activity
      )
    );

    setDirtyIds((current) => new Set([...current, activityId]));
  }

  async function addActivity() {
    const maxSort = Math.max(0, ...activities.map((activity) => toNumber(activity.sort_order)));
    const prefix = newActivityCategory.slice(0, 3).toUpperCase();
    const count = baselineActivities.filter(
      (activity) => activity.discipline === newActivityCategory
    ).length;

    const { error } = await supabase.from("wbs_activities").insert({
      project_id: projectId,
      parent_id: null,
      code: `${prefix}.${String(count + 1).padStart(2, "0")}`,
      name: "Nuova attività",
      discipline: newActivityCategory,
      unit: "unit",
      baseline_quantity: 0,
      weight_percent: 0,
      planned_start: null,
      planned_finish: null,
      sort_order: maxSort + 1,
      status: "not_started",
      is_group: false,
      level: 3,
    });

    if (error) alert(error.message);
    await loadWorkspace(projectId);
  }

  async function saveAllChanges() {
    const dirtyActivities = activities.filter((activity) => dirtyIds.has(activity.id));

    if (dirtyActivities.length === 0) return;

    setSaving(true);

    for (const activity of dirtyActivities) {
      const { error } = await supabase
        .from("wbs_activities")
        .update(cleanActivity(activity))
        .eq("id", activity.id);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    }

    setDirtyIds(new Set());
    setSaving(false);
    await loadWorkspace(projectId);
  }

  async function deleteActivity(activity) {
    if (!window.confirm(`Eliminare ${activity.code} · ${activity.name}?`)) return;

    const { error } = await supabase.from("wbs_activities").delete().eq("id", activity.id);

    if (error) alert(error.message);
    await loadWorkspace(projectId);
  }

  async function deleteSelectedActivities() {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Eliminare ${selectedIds.size} attività selezionate dalla WBS corrente?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("wbs_activities")
      .delete()
      .in("id", [...selectedIds]);

    if (error) {
      alert(error.message);
      return;
    }

    await loadWorkspace(projectId);
  }

  async function deleteAllActivities() {
    const confirmed = window.confirm(
      "ATTENZIONE: eliminare TUTTA la WBS del progetto corrente? Questa azione non elimina il progetto."
    );

    if (!confirmed) return;

    const secondConfirm = window.confirm(
      "Conferma definitiva: vuoi cancellare tutte le attività WBS di questo progetto?"
    );

    if (!secondConfirm) return;

    const { error } = await supabase
      .from("wbs_activities")
      .delete()
      .eq("project_id", projectId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadWorkspace(projectId);
  }


  return (
    <main className="construction-workspace">
      <header className="cw-workspace-header">
        <div>
          <span>PM Planning Area</span>
          <h1>Construction Baseline</h1>
          <p>Una riga = una lavorazione reale. Il Weight % è riferito al progetto.</p>
        </div>

        <div className="cw-project-select">
          <label>Project</label>
          <select
            value={projectId}
            onChange={(event) => {
              const nextProjectId = event.target.value;
              setProjectId(nextProjectId);
              loadWorkspace(nextProjectId);
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
          <span>Project</span>
          <strong>{selectedProject ? `${selectedProject.code} · ${selectedProject.name}` : "—"}</strong>
        </div>
        <div>
          <span>Activities</span>
          <strong>{metrics.activities}</strong>
        </div>
        <div>
          <span>Total Weight</span>
          <strong className={metrics.validWeight ? "weight-good" : "weight-bad"}>
            {metrics.totalWeight}%
          </strong>
        </div>
        <div>
          <span>Missing Dates</span>
          <strong>{metrics.missingDates}</strong>
        </div>
        <div>
          <span>Unsaved</span>
          <strong>{dirtyIds.size}</strong>
        </div>
      </section>

      <section className="cw-save-bar">
        <div>
          <strong>{dirtyIds.size} modifiche non salvate</strong>
          <span>
            Weight {metrics.totalWeight}% · {metrics.validWeight ? "baseline valida" : "peso da correggere"}
          </span>
        </div>

        <button type="button" onClick={saveAllChanges} disabled={dirtyIds.size === 0 || saving}>
          {saving ? "Saving..." : "Save all"}
        </button>
      </section>

      <section className="cw-toolbar baseline-toolbar">
        <input
          placeholder="Search baseline activity..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <button type="button" onClick={addActivity}>+ Activity</button>

        <input
          ref={excelInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;

            setImportingExcel(true);

            try {
              const result = await importWbsExcelFile(projectId, file);
              if (result) {
                await loadWorkspace(projectId);
                window.alert(`Import completato: ${result.activitiesCount} attività. Peso totale: ${result.totalWeight.toFixed(2)}%.`);
              }
            } catch (err) {
              window.alert(err.message || "Errore import Excel WBS");
            } finally {
              setImportingExcel(false);
            }
          }}
        />

        <button
          type="button"
          className="cw-secondary-action"
          onClick={() => excelInputRef.current?.click()}
          disabled={importingExcel}
        >
          {importingExcel ? "Reading Excel..." : "Import Excel"}
        </button>

        <button type="button" className="cw-danger-action" onClick={deleteSelectedActivities} disabled={selectedIds.size === 0}>
          Delete selected ({selectedIds.size})
        </button>

        <button type="button" className="cw-danger-action" onClick={deleteAllActivities}>
          Delete all WBS
        </button>
      </section>

      <section className="cw-grid-shell excel-shell">
        {loading ? (
          <div className="cw-empty">Loading Construction Baseline...</div>
        ) : (
          <table className="cw-grid baseline-grid">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={visibleActivities.length > 0 && visibleActivities.every((activity) => selectedIds.has(activity.id))}
                    onChange={toggleAllVisible}
                  />
                </th>
                <th>Code</th>
                <th>Category</th>
                <th>Activity</th>
                <th>U.M.</th>
                <th>Baseline Qty</th>
                <th>Weight %</th>
                <th>Planned Start</th>
                <th>Planned Finish</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {visibleActivities.map((activity) => (
                <tr key={activity.id} className={dirtyIds.has(activity.id) ? "cw-row-dirty" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(activity.id)}
                      onChange={() => toggleSelected(activity.id)}
                    />
                  </td>
                  <td>
                    <input
                      value={activity.code || ""}
                      onChange={(event) => updateActivity(activity.id, "code", event.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      value={activity.discipline || "GENERAL"}
                      onChange={(event) => updateActivity(activity.id, "discipline", event.target.value)}
                    >
                      {categories.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </td>
                  <td className="baseline-activity-cell">
                    <input
                      value={activity.name || ""}
                      onChange={(event) => updateActivity(activity.id, "name", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      value={activity.unit || ""}
                      onChange={(event) => updateActivity(activity.id, "unit", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={activity.baseline_quantity ?? 0}
                      onChange={(event) => updateActivity(activity.id, "baseline_quantity", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={activity.weight_percent ?? 0}
                      onChange={(event) => updateActivity(activity.id, "weight_percent", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={activity.planned_start || ""}
                      onChange={(event) => updateActivity(activity.id, "planned_start", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={activity.planned_finish || ""}
                      onChange={(event) => updateActivity(activity.id, "planned_finish", event.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      value={activity.status || "not_started"}
                      onChange={(event) => updateActivity(activity.id, "status", event.target.value)}
                    >
                      <option value="not_started">Not started</option>
                      <option value="in_progress">In progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="cw-delete-row"
                      onClick={() => deleteActivity(activity)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
