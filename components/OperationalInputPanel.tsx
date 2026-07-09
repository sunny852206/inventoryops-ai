"use client";

import { useState } from "react";
import { extractedCandidateItemsSchema } from "../lib/domain/schemas";
import type { ExtractedCandidateItem } from "../lib/domain/types";

export function OperationalInputPanel() {
  const [operationalInput, setOperationalInput] = useState("");
  const [candidateItems, setCandidateItems] = useState<
    ExtractedCandidateItem[]
  >([]);

  const [validationError, setValidationError] = useState<string | null>(null);

  function handleMockExtraction() {
    const mockOutput: unknown = [
      {
        name: "eggs",
        quantity: 12,
        unit: "count",
        confidence: 0.96,
      },
      {
        name: "milk",
        quantity: 1,
        unit: "bottle",
        confidence: 0.91,
      },
    ];

    const result = extractedCandidateItemsSchema.safeParse(mockOutput);

    if (!result.success) {
      setCandidateItems([]);
      setValidationError("Mock extraction failed validation.");
      return;
    }

    setCandidateItems(result.data);
    setValidationError(null);
  }

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

        <button
          type="button"
          disabled={operationalInput.trim().length === 0}
          onClick={handleMockExtraction}
        >
          Extract candidate events
        </button>
        {validationError ? (
          <p className="validation-error">{validationError}</p>
        ) : null}

        {candidateItems.length > 0 ? (
          <p className="validation-success">
            {candidateItems.length} candidate items passed validation.
          </p>
        ) : null}
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
