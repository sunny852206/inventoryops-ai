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

  function updateCandidateName(index: number, name: string) {
    setCandidateItems((currentItems) =>
      currentItems.map((candidate, candidateIndex) =>
        candidateIndex === index ? { ...candidate, name } : candidate,
      ),
    );
  }

  function updateCandidateQuantity(index: number, quantityText: string) {
    const quantity =
      quantityText.trim().length === 0 ? undefined : Number(quantityText);

    setCandidateItems((currentItems) =>
      currentItems.map((candidate, candidateIndex) =>
        candidateIndex === index ? { ...candidate, quantity } : candidate,
      ),
    );
  }

  function updateCandidateUnit(index: number, unit: string) {
    setCandidateItems((currentItems) =>
      currentItems.map((candidate, candidateIndex) =>
        candidateIndex === index
          ? {
              ...candidate,
              unit: unit.trim().length === 0 ? undefined : unit,
            }
          : candidate,
      ),
    );
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
          <div className="candidate-list">
            <p className="validation-success">
              {candidateItems.length} candidate items passed validation.
            </p>
            {candidateItems.map((candidate, index) => (
              <article className="candidate-card" key={index}>
                <p className="candidate-label">Candidate {index + 1}</p>

                <div className="candidate-details">
                  <label>
                    Name
                    <input
                      type="text"
                      value={candidate.name}
                      onChange={(event) =>
                        updateCandidateName(index, event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Quantity
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={candidate.quantity ?? ""}
                      onChange={(event) =>
                        updateCandidateQuantity(index, event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Unit
                    <input
                      type="text"
                      value={candidate.unit ?? ""}
                      onChange={(event) =>
                        updateCandidateUnit(index, event.target.value)
                      }
                    />
                  </label>

                  <div className="candidate-readonly-field">
                    <span>Confidence</span>
                    <strong>
                      {candidate.confidence !== undefined
                        ? `${Math.round(candidate.confidence * 100)}%`
                        : "Not provided"}
                    </strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>

      <div className="preview-panel">
        <h2>Input preview</h2>
        <p>
          {operationalInput.trim().length > 0
            ? operationalInput
            : "Input preview will appear here."}
        </p>
      </div>
    </section>
  );
}
