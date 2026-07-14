"use client";

import { useState } from "react";
import { extractedCandidateItemsSchema } from "../lib/domain/schemas";
import type {
  ExtractedCandidateItem,
  InventoryEvent,
} from "../lib/domain/types";
import { projectInventory } from "../lib/domain/projection";
import { scoreInventory } from "../lib/domain/scoring";

const SAMPLE_OPERATIONAL_NOTE =
  "Bought 12 eggs and 1 bottle of milk after checking the pantry. The milk should be used within the next week.";

export function OperationalInputPanel() {
  const [operationalInput, setOperationalInput] = useState("");
  const [candidateItems, setCandidateItems] = useState<
    ExtractedCandidateItem[]
  >([]); // review/edit draft
  const [confirmedEvents, setConfirmedEvents] = useState<InventoryEvent[]>([]); // user confirmed event
  const [validationError, setValidationError] = useState<string | null>(null);
  const projectedInventory = projectInventory(confirmedEvents);
  const recommendations = scoreInventory(projectedInventory);
  const workflowStatus = getWorkflowStatus({
    hasInput: operationalInput.trim().length > 0,
    candidateCount: candidateItems.length,
    confirmedEventCount: confirmedEvents.length,
  });

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

  function handleUseSampleInput() {
    setOperationalInput(SAMPLE_OPERATIONAL_NOTE);
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
        <p className="workflow-status">{workflowStatus}</p>

        <div className="workflow-section">
          <div className="section-header">
            <label htmlFor="operational-input" id="input-heading">
              Operational input
            </label>
            <button
              className="secondary-button"
              type="button"
              onClick={handleUseSampleInput}
            >
              Use sample input
            </button>
          </div>

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
        </div>

        {validationError ? (
          <p className="validation-error">{validationError}</p>
        ) : null}

        {candidateItems.length > 0 ? (
          <div className="workflow-section candidate-list">
            <h2>Review candidates</h2>
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
          <div className="workflow-section confirmed-events">
            <h2>Confirmed events</h2>
            <p className="validation-success">
              {confirmedEvents.length} inventory events confirmed.
            </p>

            <div className="event-list">
              {confirmedEvents.map((event) => (
                <article className="event-row" key={event.id}>
                  <span className="event-type">{event.type}</span>
                  <span>{event.itemName}</span>
                  <span>
                    {event.quantity}
                    {event.unit ? ` ${event.unit}` : ""}
                  </span>
                  <time dateTime={event.occurredAt}>{event.occurredAt}</time>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {projectedInventory.length > 0 ? (
          <div className="workflow-section projected-inventory">
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
          <div className="workflow-section recommendations">
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

function getWorkflowStatus(input: {
  hasInput: boolean;
  candidateCount: number;
  confirmedEventCount: number;
}) {
  if (input.confirmedEventCount > 0) {
    return "Inventory events confirmed.";
  }

  if (input.candidateCount > 0) {
    return "Candidate items are ready for review.";
  }

  if (input.hasInput) {
    return "Operational input is ready for extraction.";
  }

  return "Waiting for operational input.";
}
