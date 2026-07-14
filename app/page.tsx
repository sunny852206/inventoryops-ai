import { OperationalInputPanel } from "../components/OperationalInputPanel";

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Operational workflow workspace</p>
        <h1>InventoryOps AI</h1>
        <p className="subtitle">
          Auditable AI Workflow Engine for Operational Decisions
        </p>
        <p className="intro">
          A scoped implementation for turning operational notes into reviewed
          inventory events and deterministic recommendations.
        </p>
      </section>

      <OperationalInputPanel />
    </main>
  );
}
