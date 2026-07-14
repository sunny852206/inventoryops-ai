"use client";

import { useState } from "react";
import {
  extractedCandidateItemSchema,
  extractedCandidateItemsSchema,
} from "../lib/domain/schemas";
import type {
  ExtractedCandidateItem,
  InventoryEvent,
  InventoryEventType,
} from "../lib/domain/types";
import { projectInventory } from "../lib/domain/projection";
import { scoreInventory } from "../lib/domain/scoring";

const SAMPLE_OPERATIONAL_NOTE =
  "Bought 12 eggs and 1 bottle of milk after checking the pantry. Used 3 eggs for breakfast.";

const EVENT_TYPE_OPTIONS: InventoryEventType[] = [
  "PURCHASED",
  "CONSUMED",
  "DISCARDED",
  "CORRECTED",
];

export function OperationalInputPanel() {
  const [operationalInput, setOperationalInput] = useState("");
  const [candidateItems, setCandidateItems] = useState<
    ExtractedCandidateItem[]
  >([]); // review/edit draft
  const [confirmedEvents, setConfirmedEvents] = useState<InventoryEvent[]>([]); // user confirmed event
  const [validationError, setValidationError] = useState<string | null>(null);
  const [manualEventType, setManualEventType] =
    useState<InventoryEventType>("PURCHASED");
  const [manualItemName, setManualItemName] = useState("");
  const [manualQuantity, setManualQuantity] = useState("");
  const [manualUnit, setManualUnit] = useState("");
  const [manualValidationError, setManualValidationError] = useState<
    string | null
  >(null);
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
        type: "PURCHASED",
        name: "eggs",
        quantity: 12,
        unit: "count",
        confidence: 0.96,
      },
      {
        type: "PURCHASED",
        name: "milk",
        quantity: 1,
        unit: "bottle",
        confidence: 0.91,
      },
      {
        type: "CONSUMED",
        name: "eggs",
        quantity: 3,
        unit: "count",
        confidence: 0.89,
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

  function handleAddManualCandidate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const quantity = Number(manualQuantity);

    if (manualItemName.trim().length === 0) {
      setManualValidationError("Enter an item name.");
      return;
    }

    if (manualQuantity.trim().length === 0 || Number.isNaN(quantity)) {
      setManualValidationError("Enter a valid quantity.");
      return;
    }

    const result = extractedCandidateItemSchema.safeParse({
      type: manualEventType,
      name: manualItemName.trim(),
      quantity,
      unit: manualUnit.trim().length > 0 ? manualUnit.trim() : undefined,
    });

    if (!result.success) {
      setManualValidationError("Quantity must be greater than zero.");
      return;
    }

    setCandidateItems((currentItems) => [...currentItems, result.data]);
    setManualEventType("PURCHASED");
    setManualItemName("");
    setManualQuantity("");
    setManualUnit("");
    setManualValidationError(null);
    setValidationError(null);
  }

  function updateCandidateType(index: number, type: InventoryEventType) {
    setCandidateItems((currentItems) =>
      currentItems.map((candidate, candidateIndex) =>
        candidateIndex === index ? { ...candidate, type } : candidate,
      ),
    );
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
      type: candidate.type,
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
    <section className="workspace" aria-labelledby="capture-heading">
      <div className="input-panel">
        <p className="workflow-status">{workflowStatus}</p>

        <div className="workflow-section input-methods">
          <div>
            <h2 id="capture-heading">Capture</h2>
            <p className="section-description">
              Capture operational updates as reviewable candidate events.
            </p>
          </div>

          <div className="input-mode-grid">
            <section
              className="input-mode"
              aria-labelledby="text-input-heading"
            >
              <div className="input-mode-header">
                <div>
                  <h3 id="text-input-heading">Text input</h3>
                  <p className="section-description">
                    Extract reviewable candidates from an operational note.
                  </p>
                </div>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={handleUseSampleInput}
                >
                  Use sample input
                </button>
              </div>

              <label htmlFor="operational-input">Operational note</label>
              <textarea
                id="operational-input"
                value={operationalInput}
                onChange={(event) => setOperationalInput(event.target.value)}
                placeholder="Paste purchase notes, usage notes, spoilage notes, or restocking updates here."
                rows={8}
              />

              <div className="input-meta">
                {operationalInput.length} characters
              </div>

              <button
                type="button"
                disabled={operationalInput.trim().length === 0}
                onClick={handleMockExtraction}
              >
                Extract candidate events
              </button>
            </section>

            <section
              className="input-mode"
              aria-labelledby="structured-entry-heading"
            >
              <div>
                <h3 id="structured-entry-heading">Structured entry</h3>
                <p className="section-description">
                  Add one event to the review queue.
                </p>
              </div>

              <form
                className="manual-entry-form"
                onSubmit={handleAddManualCandidate}
              >
                <div className="manual-entry-fields">
                  <label>
                    Event type
                    <select
                      value={manualEventType}
                      onChange={(event) =>
                        setManualEventType(
                          event.target.value as InventoryEventType,
                        )
                      }
                    >
                      {EVENT_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Item name
                    <input
                      type="text"
                      value={manualItemName}
                      onChange={(event) => setManualItemName(event.target.value)}
                    />
                  </label>

                  <label>
                    Quantity
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={manualQuantity}
                      onChange={(event) => setManualQuantity(event.target.value)}
                    />
                  </label>

                  <label>
                    Unit
                    <input
                      type="text"
                      value={manualUnit}
                      onChange={(event) => setManualUnit(event.target.value)}
                    />
                  </label>
                </div>

                {manualValidationError ? (
                  <p className="validation-error" role="alert">
                    {manualValidationError}
                  </p>
                ) : null}

                <button type="submit">Add candidate event</button>
              </form>
            </section>
          </div>
        </div>

        {validationError ? (
          <p className="validation-error">{validationError}</p>
        ) : null}

        <div className="workflow-section candidate-list">
          <h2>Review queue</h2>
          {candidateItems.length > 0 ? (
            <>
            <p className="validation-success">
              {candidateItems.length} candidate events ready for review.
            </p>
            {candidateItems.map((candidate, index) => (
              <article className="candidate-card" key={index}>
                <p className="candidate-label">Candidate {index + 1}</p>

                <div className="candidate-details">
                  <label>
                    Event type
                    <select
                      value={candidate.type}
                      onChange={(event) =>
                        updateCandidateType(
                          index,
                          event.target.value as InventoryEventType,
                        )
                      }
                    >
                      {EVENT_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>

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
            </>
          ) : (
            <p className="empty-state">
              No events in the review queue. Capture text or add a structured entry.
            </p>
          )}
        </div>

        <div className="workflow-section confirmed-events">
          <h2>Event history</h2>
          {confirmedEvents.length > 0 ? (
            <>
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
                  <time dateTime={event.occurredAt}>
                    {formatDisplayDateTime(event.occurredAt)}
                  </time>
                </article>
              ))}
            </div>
            </>
          ) : (
            <p className="empty-state">
              No confirmed events. Reviewed candidates appear here after confirmation.
            </p>
          )}
        </div>

        <div className="workflow-section projected-inventory">
          <h2>Inventory state</h2>
          {projectedInventory.length > 0 ? (
            <>

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
                <p>Last updated: {formatDisplayDateTime(item.lastUpdatedAt)}</p>
              </article>
            ))}
            </>
          ) : (
            <p className="empty-state">
              Confirmed events project the current inventory state here.
            </p>
          )}
        </div>

        <div className="workflow-section recommendations">
          <h2>Recommendations</h2>
          {recommendations.length > 0 ? (
            <>

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
            </>
          ) : (
            <p className="empty-state">
              Recommendations appear when inventory state requires action.
            </p>
          )}
        </div>
      </div>

      <aside className="workflow-snapshot" aria-labelledby="workflow-snapshot-heading">
        <h2 id="workflow-snapshot-heading">Workflow snapshot</h2>
        <dl className="snapshot-list">
          <div className="snapshot-item">
            <dt>Candidate events</dt>
            <dd>{candidateItems.length}</dd>
          </div>
          <div className="snapshot-item">
            <dt>Confirmed events</dt>
            <dd>{confirmedEvents.length}</dd>
          </div>
          <div className="snapshot-item">
            <dt>Inventory items</dt>
            <dd>{projectedInventory.length}</dd>
          </div>
          <div className="snapshot-item">
            <dt>Recommendations</dt>
            <dd>{recommendations.length}</dd>
          </div>
        </dl>
      </aside>
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

function formatDisplayDateTime(isoDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDate));
}
