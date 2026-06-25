const workflowSteps = [
  "Input",
  "Extraction",
  "Validation",
  "Review",
  "Events",
  "Projection",
  "Recommendations",
];

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Initial demo workflow</p>
        <h1>InventoryOps AI</h1>
        <p className="subtitle">
          Auditable AI Workflow Engine for Operational Decisions
        </p>
        <p className="intro">
          This first screen sketches the manual review flow for messy
          operational notes. Extraction and decision logic are intentionally not
          wired up yet.
        </p>
      </section>

      <section className="workspace" aria-labelledby="input-heading">
        <div className="input-panel">
          <label htmlFor="messy-input" id="input-heading">
            Messy operational input
          </label>
          <textarea
            id="messy-input"
            disabled
            placeholder="Paste supplier updates, stock notes, or production changes here in a later step."
            rows={8}
          />
          <button type="button" disabled>
            Extract candidate events
          </button>
        </div>

        <div className="workflow-preview" aria-label="Workflow preview">
          {workflowSteps.map((step, index) => (
            <div className="workflow-item" key={step}>
              <span>{step}</span>
              {index < workflowSteps.length - 1 ? (
                <span className="arrow" aria-hidden="true">
                  -&gt;
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
