"use client";

import { useState } from "react";

export function OperationalInputPanel() {
  const [operationalInput, setOperationalInput] = useState("");

  return (
    <section className="workspace" aria-labelledby="input-heading">
      <div className="input-panel">
        <label htmlFor="operational-input" id="input-heading">
          Operational input
        </label>

        <textarea
          id="operational-input"
          value={operationalInput}
          onChange={(event) => setOperationalInput(event.target.value)}
          placeholder="Paste purchase notes, usage notes, spoilage notes, or restocking updates here."
          rows={8}
        />

        <div className="input-meta">{operationalInput.length} characters</div>

        <button type="button" disabled={operationalInput.trim().length === 0}>
          Extract candidate events
        </button>
      </div>

      <div className="preview-panel">
        <h2>Input preview</h2>
        <p>
          {operationalInput.trim().length > 0
            ? operationalInput
            : "Typed input will appear here before mock extraction is added."}
        </p>
      </div>
    </section>
  );
}
