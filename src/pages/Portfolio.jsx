import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  loadPortfolio,
  removePortfolioProject,
  savePortfolioProject,
} from "../features/portfolio/services/portfolioService";
import "../styles/portfolio.css";

const EMPTY_FORM = {
  id: "",
  code: "",
  name: "",
  municipality: "",
  province: "",
  region: "",
  developmentPartner: "",
  developmentContract: "",
  totalPowerMwDc: 0,
  pvPowerMwDc: 0,
  pvPowerMwAc: 0,
  status: "PLANNED",
  priority: "MEDIUM",
};

function formatNumber(value, digits = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : "0.0";
}

function formatMw(value) {
  return `${formatNumber(value, 2)} MW`;
}

function KpiCard({ label, value, helper }) {
  return (
    <article className="kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

function RiskBadge({ risk }) {
  return <span className={`risk-badge risk-${risk || "NO_DATA"}`}>{risk || "NO_DATA"}</span>;
}

function ProjectCard({ project, onOpen, onEdit, onDelete }) {
  const executive = project.executive || {};
  const progress = Number(executive.progress || 0);
  const planned = Number(executive.planned || 0);
  const delay = Number(executive.delay || 0);

  return (
    <article
      className="project-card project-card-clickable"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(project.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen(project.id);
      }}
    >
      <div className="project-card-header">
        <div>
          <span>{project.code}</span>
          <h3>{project.name}</h3>
        </div>
        <strong>{formatMw(project.totalPowerMwDc)}dc</strong>
      </div>

      <p className="project-location">
        {project.municipality || "—"} · {project.province || "—"} · {project.region || "—"}
      </p>

      <div className="executive-progress">
        <div className="progress-head">
          <span>Actual Progress</span>
          <strong>{formatNumber(progress)}%</strong>
        </div>
        <div className="progress-track">
          <div style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
        </div>
        <small>Planned {formatNumber(planned)}%</small>
      </div>

      <div className="project-executive-grid">

        <div>
          <span>Variance</span>
          <strong>{formatNumber(delay)}%</strong>
        </div>
        <div>
          <span>Critical</span>
          <strong>{executive.critical ?? 0}</strong>
        </div>
        <div>
          <span>Weekly</span>
          <strong>{executive.weeklyReports ?? 0}</strong>
        </div>
      </div>

      <div className="project-card-footer">
        <RiskBadge risk={executive.risk} />

        <span className={executive.hasWeekly ? "weekly-pill ok" : "weekly-pill missing"}>
          {executive.hasWeekly ? "Weekly active" : "No weekly"}
        </span>

        <div className="project-actions">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(project.id);
            }}
          >
            Open
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(project);
            }}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(project.id);
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {executive.decision ? (
        <div className="project-decision">
          <span>{executive.decision.type || "ACTION"}</span>
          <p>{executive.decision.title || executive.decision.message}</p>
        </div>
      ) : null}
    </article>
  );
}

export default function Portfolio() {
  const [exportingPpt, setExportingPpt] = useState(false);
  const [exportPptError, setExportPptError] = useState("");
  const navigate = useNavigate();

  const [portfolio, setPortfolio] = useState(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filters, setFilters] = useState({
    search: "",
    region: "all",
    partner: "all",
  });

  const isEditing = Boolean(form.id);

  async function refreshPortfolio() {
    setError("");

    try {
      const data = await loadPortfolio();
      setPortfolio(data);
    } catch (err) {
      setError(err.message || "Errore caricamento Portfolio");
    }
  }

  useEffect(() => {
    refreshPortfolio();
  }, []);

  const filteredProjects = useMemo(() => {
    if (!portfolio) return [];

    return portfolio.projects
      .filter((project) => {
        const executive = project.executive || {};
        const searchText = [
          project.code,
          project.name,
          project.municipality,
          project.province,
          project.region,
          project.developmentPartner,
          project.developmentContract,
          project.status,
          project.priority,
          executive.risk,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          searchText.includes(filters.search.trim().toLowerCase()) &&
          (filters.region === "all" || project.region === filters.region) &&
          (filters.partner === "all" || project.developmentPartner === filters.partner)
        );
      })
      .sort((a, b) => {
        const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, NO_DATA: 3 };
        const aRisk = riskOrder[a.executive?.risk] ?? 3;
        const bRisk = riskOrder[b.executive?.risk] ?? 3;
        if (aRisk !== bRisk) return aRisk - bRisk;
        return a.code.localeCompare(b.code);
      });
  }, [portfolio, filters]);

  function openProjectWorkspace(projectId) {
    navigate(`/projects/${projectId}/dashboard`);
  }

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function openCreateForm() {
    setForm(EMPTY_FORM);
    setFormVisible(true);
    setError("");
  }

  function openEditForm(project) {
    setForm({
      ...EMPTY_FORM,
      ...project,
    });
    setFormVisible(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setForm(EMPTY_FORM);
    setFormVisible(false);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      await savePortfolioProject({
        ...form,
        totalPowerMwDc: Number(form.totalPowerMwDc || 0),
        pvPowerMwDc: Number(form.pvPowerMwDc || 0),
        pvPowerMwAc: Number(form.pvPowerMwAc || 0),
      });

      closeForm();
      await refreshPortfolio();
    } catch (err) {
      setError(err.message || "Errore salvataggio progetto");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(projectId) {
    const confirmed = window.confirm("Confermi l'eliminazione del progetto dal Portfolio?");

    if (!confirmed) return;

    setError("");

    try {
      await removePortfolioProject(projectId);
      await refreshPortfolio();
    } catch (err) {
      setError(err.message || "Errore eliminazione progetto");
    }
  }

  if (error && !portfolio) {
    return (
      <main className="portfolio-page">
        <section className="portfolio-hero">
          <div>
            <span className="eyebrow">HELIOS CM Enterprise</span>
            <h1>Executive Portfolio</h1>
            <p>Errore Supabase: {error}</p>
          </div>
        </section>
      </main>
    );
  }

  if (!portfolio) {
    return (
      <main className="portfolio-page">
        <section className="portfolio-hero">
          <div>
            <span className="eyebrow">HELIOS CM Enterprise</span>
            <h1>Executive Portfolio</h1>
            <p>Loading construction snapshots...</p>
          </div>
        </section>
      </main>
    );
  }

  async function handleExportWeeklyPpt() {
    if (exportingPpt) return;

    setExportingPpt(true);
    setExportPptError("");

    try {
      const { generateWeeklyManagementPpt } = await import(
        "../features/reports/services/executiveReportService"
      );

      await generateWeeklyManagementPpt();
    } catch (exportError) {
      console.error("Weekly PPT export failed:", exportError);
      setExportPptError(
        exportError?.message || "Unable to generate the Weekly Management PPT."
      );
    } finally {
      setExportingPpt(false);
    }
  }

  return (
    <main className="portfolio-page">
      <section className="portfolio-hero">
        <div>
          <span className="eyebrow">HELIOS CM Enterprise</span>
          <h1>Executive Portfolio</h1>
          <p>
            Overview management alimentata da WBS baseline, Weekly actual production e
            Construction Engine.
          </p>
        </div>

        <div className="portfolio-hero-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={handleExportWeeklyPpt}
            disabled={exportingPpt}
          >
            {exportingPpt ? "Generating PPT..." : "Export Weekly PPT"}
          </button>

          <button className="new-project-button" type="button" onClick={openCreateForm}>
            + New Project
          </button>
        </div>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}
      {exportPptError ? (
        <div className="error-banner">
          PPT export error: {exportPptError}
        </div>
      ) : null}

      {formVisible ? (
        <section className="project-form-panel">
          <div className="section-heading">
            <div>
              <h2>{isEditing ? "Edit Project" : "New Project"}</h2>
              <p>
                {isEditing
                  ? "Aggiorna i dati anagrafici del progetto."
                  : "Crea un nuovo progetto nel Portfolio Supabase."}
              </p>
            </div>

            <button className="secondary-button" type="button" onClick={closeForm}>
              Close
            </button>
          </div>

          <form className="portfolio-form" onSubmit={handleSubmit}>
            <label>
              Code
              <input name="code" value={form.code} onChange={updateForm} required />
            </label>

            <label>
              Project name
              <input name="name" value={form.name} onChange={updateForm} required />
            </label>

            <label>
              Municipality
              <input name="municipality" value={form.municipality} onChange={updateForm} />
            </label>

            <label>
              Province
              <input name="province" value={form.province} onChange={updateForm} />
            </label>

            <label>
              Region
              <input name="region" value={form.region} onChange={updateForm} />
            </label>

            <label>
              Development Partner
              <input
                name="developmentPartner"
                value={form.developmentPartner}
                onChange={updateForm}
              />
            </label>

            <label>
              Development Contract
              <input
                name="developmentContract"
                value={form.developmentContract}
                onChange={updateForm}
              />
            </label>

            <label>
              Total MW DC
              <input
                name="totalPowerMwDc"
                type="number"
                step="0.01"
                value={form.totalPowerMwDc}
                onChange={updateForm}
              />
            </label>

            <label>
              PV MW DC
              <input
                name="pvPowerMwDc"
                type="number"
                step="0.01"
                value={form.pvPowerMwDc}
                onChange={updateForm}
              />
            </label>

            <label>
              PV MW AC
              <input
                name="pvPowerMwAc"
                type="number"
                step="0.01"
                value={form.pvPowerMwAc}
                onChange={updateForm}
              />
            </label>

            <label>
              Status
              <select name="status" value={form.status} onChange={updateForm}>
                <option value="PLANNED">PLANNED</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="ON_HOLD">ON_HOLD</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </label>

            <label>
              Priority
              <select name="priority" value={form.priority} onChange={updateForm}>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </label>

            <div className="form-actions">
              <button className="new-project-button" type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : isEditing ? "Update Project" : "Create Project"}
              </button>
              <button className="secondary-button" type="button" onClick={closeForm}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="kpi-grid executive-kpi-grid">
        <KpiCard label="Projects" value={portfolio.kpis.totalProjects} helper="Active portfolio" />
        <KpiCard label="Total MW DC" value={formatNumber(portfolio.kpis.totalMwDc, 2)} helper="Portfolio power" />
        <KpiCard label="Avg Progress" value={`${formatNumber(portfolio.kpis.avgProgress)}%`} helper="Engine actual" />
        
        <KpiCard label="At Risk" value={portfolio.kpis.projectsAtRisk} helper="High risk projects" />
        <KpiCard label="Delayed" value={portfolio.kpis.delayedProjects} helper="Negative variance" />
        <KpiCard label="No Weekly" value={portfolio.kpis.noWeekly} helper="Missing actuals" />
        
      </section>

      <section className="filters-bar">
        <input
          name="search"
          value={filters.search}
          onChange={updateFilter}
          placeholder="Search project, code, municipality, risk..."
        />

        <select name="region" value={filters.region} onChange={updateFilter}>
          <option value="all">All regions</option>
          {portfolio.filters.regions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>

        <select name="partner" value={filters.partner} onChange={updateFilter}>
          <option value="all">All partners</option>
          {portfolio.filters.partners.map((partner) => (
            <option key={partner} value={partner}>
              {partner}
            </option>
          ))}
        </select>
      </section>

      <section className="section-heading">
        <div>
          <h2>Executive Project Cards</h2>
          <p>
            {filteredProjects.length} projects shown on {portfolio.projects.length} total.
          </p>
        </div>
      </section>

      <section className="projects-grid executive-projects-grid">
        {filteredProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onOpen={openProjectWorkspace}
            onEdit={openEditForm}
            onDelete={handleDelete}
          />
        ))}
      </section>
    </main>
  );
}
