import { useCallback, useEffect, useMemo, useState } from "react";
import { useProject } from "../../projects/context/useProject";
import { loadProjectWbs } from "../../wbs/services/wbsService";

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function riskClass(delayDays) {
  if (delayDays >= 14) return "high";
  if (delayDays >= 5) return "medium";
  return "low";
}

export default function ConstructionTree() {
  const { projectId } = useProject();
  const [snapshot, setSnapshot] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTree = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError("");

    try {
      const data = await loadProjectWbs(projectId);
      setSnapshot(data);

      const initialExpanded = {};
      data.disciplineProgress?.forEach((discipline) => {
        initialExpanded[discipline.discipline] = true;
      });

      setExpanded((current) =>
        Object.keys(current).length ? current : initialExpanded
      );
    } catch (err) {
      setError(err.message || "Unable to load Construction Tree");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const activitiesByDiscipline = useMemo(() => {
    if (!snapshot?.activities) return {};

    return snapshot.activities.reduce((acc, activity) => {
      const key = activity.discipline || "GENERAL";
      if (!acc[key]) acc[key] = [];
      acc[key].push(activity);
      return acc;
    }, {});
  }, [snapshot]);

  function toggle(discipline) {
    setExpanded((current) => ({
      ...current,
      [discipline]: !current[discipline],
    }));
  }

  if (loading) return <p className="construction-tree-empty">Loading construction tree...</p>;
  if (error) return <div className="construction-tree-error">{error}</div>;
  if (!snapshot?.disciplines?.length) return <p className="construction-tree-empty">No baseline available.</p>;

  return (
    <section className="construction-tree">
      <div className="construction-tree-title">
        <div>
          <span>Construction Baseline</span>
          <h3>Construction Tree</h3>
        </div>
        <strong>{formatPercent(snapshot.overallProgress)}</strong>
      </div>

      <div className="construction-tree-list">
        {snapshot.disciplines.map((discipline) => {
          const rows = activitiesByDiscipline[discipline.discipline] || [];
          const isOpen = expanded[discipline.discipline];

          return (
            <article key={discipline.discipline} className="construction-tree-node">
              <button type="button" onClick={() => toggle(discipline.discipline)}>
                <span>{isOpen ? "▾" : "▸"}</span>
                <div>
                  <strong>{discipline.discipline}</strong>
                  <small>
                    {rows.length} activities · {formatPercent(discipline.weightPercent)} weight
                  </small>
                </div>
                <b>{formatPercent(discipline.progress)}</b>
              </button>

              {isOpen ? (
                <div className="construction-tree-children">
                  {rows.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="construction-tree-activity">
                      <div>
                        <strong>{activity.code}</strong>
                        <span>{activity.name}</span>
                      </div>
                      <em className={riskClass(activity.delayDays)}>
                        {formatPercent(activity.progress)}
                      </em>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
