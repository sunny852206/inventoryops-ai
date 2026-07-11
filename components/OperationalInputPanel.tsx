"use client";

import { useState } from "react";
import { extractedCandidateItemsSchema } from "../lib/domain/schemas";
import type {
  ExtractedCandidateItem,
  InventoryEvent,
} from "../lib/domain/types";
import { projectInventory } from "../lib/domain/projection";
import { scoreInventory } from "../lib/domain/scoring";

export function OperationalInputPanel() {
  const [operationalInput, setOperationalInput] = useState("");
  const [candidateItems, setCandidateItems] = useState<
    ExtractedCandidateItem[]
  >([]); // review/edit draft
  const [confirmedEvents, setConfirmedEvents] = useState<InventoryEvent[]>([]); // user confirmed event
  const [validationError, setValidationError] = useState<string | null>(null);
  const projectedInventory = projectInventory(confirmedEvents);
  const recommendations = scoreInventory(projectedInventory);

  function handleMockExtraction() {
    // Temporary sample data until real extraction is connected.
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

  function handleConfirmCandidates() {
    const result = extractedCandidateItemsSchema.safeParse(candidateItems);

    if (!result.success) {
      setValidationError("Reviewed candidates failed validation.");
      return;
    }

    const nowIso = new Date().toISOString();

    const events: InventoryEvent[] = result.data.map((candidate, index) => ({
      id: `evt_${nowIso}_${index}`,
      type: "PURCHASED",
      itemName: candidate.name,
      quantity: candidate.quantity ?? 1,
      unit: candidate.unit,
      occurredAt: nowIso,
      notes: candidate.notes,
      sourceText: operationalInput,
    }));

    setConfirmedEvents(events);
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

            <button type="button" onClick={handleConfirmCandidates}>
              Confirm reviewed candidates
            </button>
          </div>
        ) : null}

        {confirmedEvents.length > 0 ? (
          <p className="validation-success">
            {confirmedEvents.length} inventory events confirmed.
          </p>
        ) : null}

        {projectedInventory.length > 0 ? (
          <div className="projected-inventory">
            <h2>Projected inventory</h2>

            {projectedInventory.map((item, index) => (
              <article
                className="inventory-card"
                key={`${item.itemName}-${index}`}
              >
                <h3>{item.itemName}</h3>
                <p>
                  Quantity: {item.quantity}
                  {item.unit ? ` ${item.unit}` : ""}
                </p>
                <p>Last updated: {item.lastUpdatedAt}</p>
              </article>
            ))}
          </div>
        ) : null}

        {recommendations.length > 0 ? (
          <div className="recommendations">
            <h2>Recommendations</h2>

            {recommendations.map((recommendation) => (
              <article className="recommendation-card" key={recommendation.id}>
                <p className="recommendation-type">{recommendation.type}</p>
                <h3>{recommendation.itemName}</h3>
                <p>Score: {recommendation.score}</p>

                <ul>
                  {recommendation.factors.map((factor) => (
                    <li key={factor.label}>
                      {factor.label}: {factor.explanation}
                    </li>
                  ))}
                </ul>
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
