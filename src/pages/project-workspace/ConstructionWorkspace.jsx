import { useMemo, useState } from "react";
import ActivityHeader from "../../features/construction-workspace/components/ActivityHeader";
import ConstructionTree from "../../features/construction-workspace/components/ConstructionTree";
import ExecutionMode from "../../features/construction-workspace/components/ExecutionMode";
import PlanningMode from "../../features/construction-workspace/components/PlanningMode";
import ActivityCommandCenter from "../../features/construction-workspace/components/ActivityCommandCenter";
import "../../styles/construction-workspace.css";

const initialActivities = [
  {
    id: "civil",
    code: "CIV",
    name: "Opere Civili",
    discipline: "Civil",
    status: "in_progress",
    risk: "medium",
    plannedQuantity: 1310,
    actualQuantity: 720,
    unit: "ml",
    weight: 10,
    owner: "EPC",
    plannedStart: "2026-06-10",
    plannedFinish: "2026-08-20",
    forecastFinish: "2026-08-28",
    notes: "Recinzioni, scavi, viabilità e opere preliminari.",
  },
  {
    id: "mechanical",
    code: "MEC",
    name: "Opere Meccaniche",
    discipline: "Mechanical",
    status: "in_progress",
    risk: "high",
    plannedQuantity: 7436,
    actualQuantity: 2510,
    unit: "mod",
    weight: 30,
    owner: "EPC",
    plannedStart: "2026-07-01",
    plannedFinish: "2026-09-10",
    forecastFinish: "2026-09-24",
    notes: "Pali, tracker, strutture e moduli.",
  },
  {
    id: "electrical",
    code: "ELE",
    name: "Opere Elettriche",
    discipline: "Electrical",
    status: "not_started",
    risk: "medium",
    plannedQuantity: 6488,
    actualQuantity: 0,
    unit: "ml",
    weight: 38,
    owner: "EPC",
    plannedStart: "2026-08-01",
    plannedFinish: "2026-10-15",
    forecastFinish: "2026-10-22",
    notes: "Cavi BT/MT, inverter, quadri, terra e monitoraggio.",
  },
  {
    id: "commissioning",
    code: "COM",
    name: "Collaudi e Commissioning",
    discipline: "Commissioning",
    status: "not_started",
    risk: "low",
    plannedQuantity: 100,
    actualQuantity: 0,
    unit: "%",
    weight: 6,
    owner: "IPP / DL",
    plannedStart: "2026-10-01",
    plannedFinish: "2026-11-15",
    forecastFinish: "2026-11-20",
    notes: "Cold commissioning, hot commissioning e PR test.",
  },
];

function getProgress(activity) {
  if (!activity?.plannedQuantity) return 0;
  return Math.min(
    100,
    Math.round((Number(activity.actualQuantity || 0) / Number(activity.plannedQuantity)) * 100)
  );
}

export default function ConstructionWorkspace() {
  const [activities, setActivities] = useState(initialActivities);
  const [selectedId, setSelectedId] = useState(initialActivities[1].id);
  const [mode, setMode] = useState("execution");

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.id === selectedId) || activities[0],
    [activities, selectedId]
  );

  const metrics = useMemo(() => {
    const totalWeight = activities.reduce((sum, activity) => sum + Number(activity.weight || 0), 0);

    const progressWeight = activities.reduce((sum, activity) => {
      return sum + getProgress(activity) * Number(activity.weight || 0);
    }, 0);

    return {
      progress: totalWeight ? Math.round(progressWeight / totalWeight) : 0,
      totalActivities: activities.length,
      highRisk: activities.filter((activity) => activity.risk === "high").length,
      inProgress: activities.filter((activity) => activity.status === "in_progress").length,
      completed: activities.filter((activity) => activity.status === "completed").length,
    };
  }, [activities]);

  function updateActivity(activityId, changes) {
    setActivities((current) =>
      current.map((activity) =>
        activity.id === activityId ? { ...activity, ...changes } : activity
      )
    );
  }

  function addActivity() {
    const newActivity = {
      id: `activity-${Date.now()}`,
      code: "NEW",
      name: "Nuova attività",
      discipline: "General",
      status: "not_started",
      risk: "low",
      plannedQuantity: 0,
      actualQuantity: 0,
      unit: "unit",
      weight: 1,
      owner: "EPC",
      plannedStart: "",
      plannedFinish: "",
      forecastFinish: "",
      notes: "",
    };

    setActivities((current) => [...current, newActivity]);
    setSelectedId(newActivity.id);
  }

  function deleteActivity(activityId) {
    const nextActivities = activities.filter((activity) => activity.id !== activityId);
    setActivities(nextActivities);
    setSelectedId(nextActivities[0]?.id || "");
  }

  return (
    <main className="construction-workspace">
      <ActivityHeader mode={mode} onModeChange={setMode} metrics={metrics} />

      <section className="cw-layout">
        <ConstructionTree
          activities={activities}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAddActivity={addActivity}
        />

        <section className="cw-content">
          {mode === "execution" ? (
            <ExecutionMode activity={selectedActivity} onChange={updateActivity} />
          ) : (
            <PlanningMode activity={selectedActivity} onChange={updateActivity} />
          )}
        </section>

        <ActivityCommandCenter
          activity={selectedActivity}
          metrics={metrics}
          onChange={updateActivity}
          onAddActivity={addActivity}
          onDeleteActivity={deleteActivity}
        />
      </section>
    </main>
  );
}
