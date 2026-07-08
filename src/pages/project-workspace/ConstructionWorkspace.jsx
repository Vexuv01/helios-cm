import { useState } from "react";
import ConstructionTree from "../../features/construction-workspace/components/ConstructionTree";
import ProjectWbs from "./ProjectWbs";
import ProjectWeekly from "./ProjectWeekly";
import "../../styles/construction-workspace.css";

const WORKSPACE_TABS = [
  { id: "baseline", label: "Baseline WBS" },
  { id: "weekly", label: "Weekly Production" },
];

export default function ConstructionWorkspace() {
  const [activeTab, setActiveTab] = useState("baseline");

  return (
    <div className="construction-workspace-page">
      <header className="construction-workspace-header">
        <div>
          <span>HELIOS Construction Workspace</span>
          <h2>Operate the construction site</h2>
          <p>
            One operational workspace for baseline, activities, weekly production
            and field updates. Control Room remains read-only.
          </p>
        </div>
      </header>

      <ConstructionTree />

      <nav className="construction-workspace-tabs">
        {WORKSPACE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="construction-workspace-content">
        {activeTab === "baseline" ? <ProjectWbs /> : <ProjectWeekly />}
      </section>
    </div>
  );
}
