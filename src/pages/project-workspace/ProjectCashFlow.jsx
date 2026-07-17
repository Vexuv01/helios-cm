import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useProject } from "../../features/projects/context/useProject";
import { buildCashFlowSnapshot } from "../../features/cash-flow/domain/cashFlowEngine";
import {
  createCashFlowEvent,
  deleteCashFlowEvent,
  listCashFlowEvents,
  replaceProjectCashFlowEvents,
} from "../../features/cash-flow/repositories/cashFlowRepository";
import {
  exportCashFlowExcel,
  exportCashFlowTemplate,
  parseCashFlowExcel,
} from "../../features/cash-flow/import/cashFlowExcel";
import "../../styles/cash-flow.css";

const EMPTY_FORM = {
  paymentDate: "",
  amount: "",
  category: "",
  detail: "",
  description: "",
  orderingParty: "",
  recipient: "",
  iban: "",
  notes: "",
};

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

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("it-IT").format(
    new Date(`${value}T12:00:00`)
  );
}

function formatMonthKey(value) {
  if (!value) return "";

  const [year, month] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function CashFlowKpi({ label, value, detail }) {
  return (
    <article className="cash-flow-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function MonthlyTooltip({
  active,
  payload,
  label,
}) {
  if (!active || !payload?.length) return null;

  const amount = payload[0]?.value || 0;

  return (
    <div className="cash-flow-chart-tooltip">
      <span>{formatMonthKey(label)}</span>
      <strong>{euro(amount)}</strong>
      <small>Clicca per vedere i pagamenti</small>
    </div>
  );
}

export default function ProjectCashFlow() {
  const { currentProject } = useProject();

  const projectId = currentProject?.id;
  const fileInputRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedMonthKey, setSelectedMonthKey] =
    useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const snapshot = buildCashFlowSnapshot(rows);

  const selectedMonthPayments = useMemo(() => {
    if (!selectedMonthKey) return [];

    return snapshot.events.filter((event) =>
      event.paymentDate?.startsWith(
        selectedMonthKey
      )
    );
  }, [selectedMonthKey, snapshot.events]);

  const selectedMonthTotal = useMemo(
    () =>
      selectedMonthPayments.reduce(
        (sum, event) =>
          sum + Number(event.amount || 0),
        0
      ),
    [selectedMonthPayments]
  );

  const loadPage = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError("");

    try {
      const data =
        await listCashFlowEvents(projectId);

      setRows(data);
    } catch (err) {
      setError(
        err.message ||
          "Errore caricamento Cash Flow"
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (
      selectedMonthKey &&
      !snapshot.monthly.some(
        (month) =>
          month.key === selectedMonthKey
      )
    ) {
      setSelectedMonthKey("");
    }
  }, [selectedMonthKey, snapshot.monthly]);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function selectMonth(entry) {
    const monthKey =
      entry?.key ||
      entry?.payload?.key ||
      "";

    if (!monthKey) return;

    setSelectedMonthKey((current) =>
      current === monthKey ? "" : monthKey
    );
  }

  async function handleCreate(event) {
    event.preventDefault();

    if (!form.paymentDate) {
      setError(
        "Inserisci la data del pagamento"
      );
      return;
    }

    const amount = Number(form.amount);

    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      setError("Inserisci un importo valido");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await createCashFlowEvent({
        projectId,
        ...form,
        amount,
      });

      setForm(EMPTY_FORM);
      setMessage(
        "Pagamento aggiunto correttamente"
      );

      await loadPage();
    } catch (err) {
      setError(
        err.message ||
          "Errore salvataggio pagamento"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(eventRow) {
    const confirmed = window.confirm(
      `Eliminare il pagamento del ${formatDate(
        eventRow.paymentDate
      )} pari a ${euro(eventRow.amount)}?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await deleteCashFlowEvent(eventRow.id);

      setRows((current) =>
        current.filter(
          (row) => row.id !== eventRow.id
        )
      );

      setMessage("Pagamento eliminato");
    } catch (err) {
      setError(
        err.message ||
          "Errore eliminazione pagamento"
      );
    }
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !projectId) return;

    setImporting(true);
    setError("");
    setMessage("");

    try {
      const parsed =
        await parseCashFlowExcel(file);

      const projectInfo =
        parsed.detectedProjectCode ||
        parsed.detectedProjectName
          ? `\nProgetto rilevato: ${
              parsed.detectedProjectCode || ""
            } ${
              parsed.detectedProjectName || ""
            }`
          : "";

      const confirmed = window.confirm(
        `Sono state trovate ${parsed.importedRows} righe valide.` +
          `${projectInfo}\n\n` +
          "L'importazione sostituirà integralmente il Cash Flow attuale del progetto.\n\n" +
          "Procedere?"
      );

      if (!confirmed) return;

      await replaceProjectCashFlowEvents(
        projectId,
        parsed.events
      );

      setSelectedMonthKey("");

      await loadPage();

      const warningText =
        parsed.warnings.length > 0
          ? ` ${parsed.warnings.length} righe ignorate.`
          : "";

      setMessage(
        `${parsed.importedRows} pagamenti importati.${warningText}`
      );
    } catch (err) {
      setError(
        err.message ||
          "Errore importazione Cash Flow"
      );
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <section className="cash-flow-state">
        Caricamento Cash Flow...
      </section>
    );
  }

  return (
    <div className="cash-flow-page">
      <header className="cash-flow-hero">
        <div>
          <span>FINANCIAL CONTROL AREA</span>

          <h2>Cash Flow</h2>

          <p>
            Gestione delle uscite finanziarie
            reali del progetto. Nessun valore
            deriva dalla WBS o dal Recovery
            Forecast.
          </p>
        </div>

        <div className="cash-flow-actions">
          <button
            type="button"
            className="cash-flow-button secondary"
            onClick={exportCashFlowTemplate}
          >
            Download Template
          </button>

          <button
            type="button"
            className="cash-flow-button secondary"
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={importing}
          >
            {importing
              ? "Importazione..."
              : "Import Excel"}
          </button>

          <button
            type="button"
            className="cash-flow-button primary"
            disabled={
              snapshot.events.length === 0
            }
            onClick={() =>
              exportCashFlowExcel({
                projectName:
                  currentProject?.name,
                events: snapshot.events,
              })
            }
          >
            Export Excel
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={handleImport}
          />
        </div>
      </header>

      {error ? (
        <div className="cash-flow-alert error">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="cash-flow-alert success">
          {message}
        </div>
      ) : null}

      <section className="cash-flow-kpi-grid">
        <CashFlowKpi
          label="Total Cash Out"
          value={euro(snapshot.total)}
          detail="Totale uscite registrate"
        />

        <CashFlowKpi
          label="Next Payment"
          value={euro(
            snapshot.nextPayment?.amount || 0
          )}
          detail={
            snapshot.nextPayment?.paymentDate
              ? formatDate(
                  snapshot.nextPayment
                    .paymentDate
                )
              : "Nessun pagamento futuro"
          }
        />

        <CashFlowKpi
          label="Cash Events"
          value={snapshot.eventCount}
          detail="Numero pagamenti"
        />
      </section>

      <section className="cash-flow-panel cash-flow-chart-panel">
        <div className="cash-flow-panel-head">
          <div>
            <span>MONTHLY DISTRIBUTION</span>
            <h3>Monthly Cash Out</h3>
          </div>

          <div className="cash-flow-chart-head-meta">
            <strong>
              {snapshot.monthly.length} mesi
            </strong>
            <small>
              Clicca su una barra per aprire
              il dettaglio
            </small>
          </div>
        </div>

        {snapshot.monthly.length === 0 ? (
          <div className="cash-flow-empty">
            <strong>
              Nessun dato Cash Flow
            </strong>
            <span>
              Inserisci un pagamento oppure
              importa il file Excel del
              progetto.
            </span>
          </div>
        ) : (
          <div className="cash-flow-chart">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={snapshot.monthly}
                margin={{
                  top: 22,
                  right: 22,
                  bottom: 8,
                  left: 12,
                }}
              >
                <defs>
                  <linearGradient
                    id="cashFlowBarGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#7dd3fc"
                    />
                    <stop
                      offset="100%"
                      stopColor="#0ea5e9"
                    />
                  </linearGradient>

                  <linearGradient
                    id="cashFlowSelectedGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#f8fafc"
                    />
                    <stop
                      offset="100%"
                      stopColor="#38bdf8"
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="rgba(148,163,184,.11)"
                  vertical={false}
                  strokeDasharray="4 5"
                />

                <XAxis
                  dataKey="key"
                  stroke="#64748b"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => {
                    const month =
                      snapshot.monthly.find(
                        (item) =>
                          item.key === value
                      );

                    return month?.month || value;
                  }}
                  tick={{
                    fill: "#94a3b8",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                />

                <YAxis
                  stroke="#64748b"
                  width={82}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={compactEuro}
                  tick={{
                    fill: "#64748b",
                    fontSize: 12,
                  }}
                />

                <Tooltip
                  cursor={{
                    fill:
                      "rgba(56,189,248,.07)",
                  }}
                  content={
                    <MonthlyTooltip />
                  }
                />

                <Bar
                  dataKey="amount"
                  radius={[12, 12, 3, 3]}
                  maxBarSize={68}
                  minPointSize={4}
                  onClick={selectMonth}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  {snapshot.monthly.map(
                    (month) => (
                      <Cell
                        key={month.key}
                        fill={
                          selectedMonthKey ===
                          month.key
                            ? "url(#cashFlowSelectedGradient)"
                            : "url(#cashFlowBarGradient)"
                        }
                        opacity={
                          selectedMonthKey &&
                          selectedMonthKey !==
                            month.key
                            ? 0.42
                            : 1
                        }
                      />
                    )
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {selectedMonthKey ? (
          <div className="cash-flow-month-detail">
            <header className="cash-flow-month-detail-head">
              <div>
                <span>
                  MONTH PAYMENT DETAIL
                </span>

                <h4>
                  {formatMonthKey(
                    selectedMonthKey
                  )}
                </h4>

                <p>
                  {
                    selectedMonthPayments.length
                  }{" "}
                  pagamenti registrati
                </p>
              </div>

              <div className="cash-flow-month-total">
                <span>Totale mese</span>
                <strong>
                  {euro(selectedMonthTotal)}
                </strong>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedMonthKey("")
                  }
                >
                  Chiudi dettaglio
                </button>
              </div>
            </header>

            <div className="cash-flow-month-list">
              {selectedMonthPayments.map(
                (payment) => (
                  <article
                    key={payment.id}
                    className="cash-flow-month-payment"
                  >
                    <div className="cash-flow-month-date">
                      <strong>
                        {formatDate(
                          payment.paymentDate
                        )}
                      </strong>
                      <span>
                        {payment.category ||
                          "Senza categoria"}
                      </span>
                    </div>

                    <div className="cash-flow-month-description">
                      <strong>
                        {payment.description ||
                          payment.detail ||
                          "Pagamento"}
                      </strong>

                      <span>
                        {payment.recipient ||
                          payment.orderingParty ||
                          "Beneficiario non indicato"}
                      </span>
                    </div>

                    <strong className="cash-flow-month-amount">
                      {euro(payment.amount)}
                    </strong>
                  </article>
                )
              )}
            </div>
          </div>
        ) : null}
      </section>

      <section className="cash-flow-panel">
        <div className="cash-flow-panel-head">
          <div>
            <span>MANUAL ENTRY</span>
            <h3>Nuovo pagamento</h3>
          </div>
        </div>

        <form
          className="cash-flow-form"
          onSubmit={handleCreate}
        >
          <label>
            <span>Data pagamento *</span>
            <input
              type="date"
              value={form.paymentDate}
              onChange={(event) =>
                updateForm(
                  "paymentDate",
                  event.target.value
                )
              }
              required
            />
          </label>

          <label>
            <span>Importo *</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={form.amount}
              onChange={(event) =>
                updateForm(
                  "amount",
                  event.target.value
                )
              }
              required
            />
          </label>

          <label>
            <span>Categoria</span>
            <input
              value={form.category}
              placeholder="EPC, DL, Fornitura..."
              onChange={(event) =>
                updateForm(
                  "category",
                  event.target.value
                )
              }
            />
          </label>

          <label>
            <span>Dettaglio</span>
            <input
              value={form.detail}
              placeholder="SAL 01"
              onChange={(event) =>
                updateForm(
                  "detail",
                  event.target.value
                )
              }
            />
          </label>

          <label className="wide">
            <span>Descrizione</span>
            <input
              value={form.description}
              placeholder="Descrizione del pagamento"
              onChange={(event) =>
                updateForm(
                  "description",
                  event.target.value
                )
              }
            />
          </label>

          <label>
            <span>Ordinante</span>
            <input
              value={form.orderingParty}
              onChange={(event) =>
                updateForm(
                  "orderingParty",
                  event.target.value
                )
              }
            />
          </label>

          <label>
            <span>Beneficiario</span>
            <input
              value={form.recipient}
              onChange={(event) =>
                updateForm(
                  "recipient",
                  event.target.value
                )
              }
            />
          </label>

          <label className="wide">
            <span>IBAN</span>
            <input
              value={form.iban}
              onChange={(event) =>
                updateForm(
                  "iban",
                  event.target.value
                )
              }
            />
          </label>

          <label className="wide">
            <span>Note</span>
            <textarea
              rows="3"
              value={form.notes}
              onChange={(event) =>
                updateForm(
                  "notes",
                  event.target.value
                )
              }
            />
          </label>

          <div className="cash-flow-form-actions">
            <button
              type="submit"
              className="cash-flow-button primary"
              disabled={saving}
            >
              {saving
                ? "Salvataggio..."
                : "Aggiungi pagamento"}
            </button>
          </div>
        </form>
      </section>

      <section className="cash-flow-panel">
        <div className="cash-flow-panel-head">
          <div>
            <span>PAYMENT REGISTER</span>
            <h3>Elenco pagamenti</h3>
          </div>

          <strong>
            {snapshot.eventCount} righe
          </strong>
        </div>

        <div className="cash-flow-table-wrap">
          <table className="cash-flow-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Categoria</th>
                <th>Dettaglio</th>
                <th>Descrizione</th>
                <th>Beneficiario</th>
                <th>Importo</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {snapshot.events.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="cash-flow-table-empty"
                  >
                    Nessun pagamento
                    registrato.
                  </td>
                </tr>
              ) : (
                snapshot.events.map(
                  (eventRow) => (
                    <tr key={eventRow.id}>
                      <td>
                        {formatDate(
                          eventRow.paymentDate
                        )}
                      </td>

                      <td>
                        {eventRow.category ||
                          "—"}
                      </td>

                      <td>
                        {eventRow.detail ||
                          "—"}
                      </td>

                      <td>
                        <strong>
                          {eventRow.description ||
                            "—"}
                        </strong>

                        {eventRow.notes ? (
                          <small>
                            {eventRow.notes}
                          </small>
                        ) : null}
                      </td>

                      <td>
                        {eventRow.recipient ||
                          "—"}
                      </td>

                      <td className="cash-flow-amount">
                        {euro(
                          eventRow.amount
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="cash-flow-delete"
                          onClick={() =>
                            handleDelete(
                              eventRow
                            )
                          }
                        >
                          Elimina
                        </button>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
