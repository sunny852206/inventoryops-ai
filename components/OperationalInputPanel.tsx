"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  extractedCandidateItemSchema,
  extractedCandidateItemsSchema,
} from "../lib/domain/schemas";
import type {
  ExtractedCandidateItem,
  InventoryEvent,
  InventoryEventType,
  InventoryItem,
  Recommendation,
} from "../lib/domain/types";
import { projectInventory } from "../lib/domain/projection";
import { scoreInventory } from "../lib/domain/scoring";
import {
  normalizeItemName,
  normalizeUnit,
} from "../lib/domain/normalization";

const SAMPLE_NOTES = [
  {
    label: "Grocery run",
    note: "Bought 18 eggs and 2 bottles of milk. Used 4 eggs, threw away 2 bananas, and corrected milk to 1 bottle.",
  },
  {
    label: "Meal prep",
    note: "Used 2 chicken thighs, 1 onion, and 3 eggs for meal prep. Bought 6 apples.",
  },
  {
    label: "Correction",
    note: "Correction: I have 1 bottle of milk, 14 eggs, and 0 bananas left.",
  },
] as const;

const EVENT_TYPE_OPTIONS: InventoryEventType[] = [
  "PURCHASED",
  "CONSUMED",
  "DISCARDED",
  "CORRECTED",
];

const CONFIRMED_EVENTS_STORAGE_KEY = "inventoryops.confirmedEvents";
const FOCUSABLE_ELEMENT_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const RECOMMENDATION_GROUPS: Array<{
  type: Recommendation["type"];
  label: string;
}> = [
  { type: "USE_SOON", label: "Use soon" },
  { type: "RESTOCK_SOON", label: "Restock" },
  { type: "AVOID_DUPLICATE", label: "Avoid buying more" },
];

type EventEditDraft = {
  type: InventoryEventType;
  itemName: string;
  quantity: string;
  unit: string;
};

type DraftSource = "AI" | "STRUCTURED";

type DraftCandidate = ExtractedCandidateItem & {
  draftId: string;
  draftSource: DraftSource;
};

type ExtractionStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success"; count: number }
  | { state: "error"; message: string };

type ActionPlanResult = {
  explanation: string;
  recommendationSnapshot: string;
};

type ActionPlanError = {
  message: string;
  recommendationSnapshot: string;
};

type UpdateStep = "capture" | "review";
type InputMode = "text" | "structured";
type WorkspaceView = "overview" | "inventory" | "activity";
type StructuredQuickAction = {
  item: InventoryItem;
};

const WORKSPACE_VIEWS: Array<{ id: WorkspaceView; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "inventory", label: "Inventory" },
  { id: "activity", label: "Activity" },
];

export function OperationalInputPanel() {
  const [operationalInput, setOperationalInput] = useState("");
  const [candidateItems, setCandidateItems] = useState<DraftCandidate[]>([]);
  const [confirmedEvents, setConfirmedEvents] = useState<InventoryEvent[]>([]);
  const [hasLoadedConfirmedEvents, setHasLoadedConfirmedEvents] =
    useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState<ExtractionStatus>({
    state: "idle",
  });
  const [manualEventType, setManualEventType] =
    useState<InventoryEventType>("PURCHASED");
  const [manualItemName, setManualItemName] = useState("");
  const [manualQuantity, setManualQuantity] = useState("");
  const [manualUnit, setManualUnit] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualValidationError, setManualValidationError] = useState<
    string | null
  >(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventEditDraft, setEventEditDraft] = useState<EventEditDraft | null>(
    null,
  );
  const [eventEditError, setEventEditError] = useState<string | null>(null);
  const [actionPlan, setActionPlan] = useState<ActionPlanResult | null>(null);
  const [isGeneratingActionPlan, setIsGeneratingActionPlan] = useState(false);
  const [actionPlanError, setActionPlanError] = useState<ActionPlanError | null>(
    null,
  );
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateStep, setUpdateStep] = useState<UpdateStep>("capture");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [structuredQuickAction, setStructuredQuickAction] =
    useState<StructuredQuickAction | null>(null);
  const [activeView, setActiveView] = useState<WorkspaceView>("overview");
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(
    null,
  );
  const updateModalRef = useRef<HTMLElement>(null);
  const updateModalTitleRef = useRef<HTMLHeadingElement>(null);

  const projectedInventory = useMemo(
    () => projectInventory(confirmedEvents),
    [confirmedEvents],
  );
  const recommendations = useMemo(
    () => scoreInventory(projectedInventory),
    [projectedInventory],
  );
  const recommendationSnapshot = JSON.stringify(recommendations);
  const recommendationGroups = groupRecommendations(recommendations);
  const priorityRecommendations = recommendationGroups.flatMap((group) =>
    group.recommendations.map((recommendation) => ({
      actionLabel: group.label,
      recommendation,
    })),
  );
  const recentEvents = useMemo(
    () =>
      [...confirmedEvents].sort(
        (first, second) =>
          new Date(second.occurredAt).getTime() -
          new Date(first.occurredAt).getTime(),
      ),
    [confirmedEvents],
  );
  const currentActionPlan =
    actionPlan?.recommendationSnapshot === recommendationSnapshot
      ? actionPlan.explanation
      : null;
  const currentActionPlanError =
    actionPlanError?.recommendationSnapshot === recommendationSnapshot
      ? actionPlanError.message
      : null;
  const restockCount = getRecommendationCount(recommendations, "RESTOCK_SOON");
  const duplicateRiskCount = getRecommendationCount(
    recommendations,
    "AVOID_DUPLICATE",
  );
  const hasConfirmedEvents = confirmedEvents.length > 0;
  const hasSampleData =
    hasConfirmedEvents &&
    confirmedEvents.some((event) => event.sourceText === "Sample workspace");

  useEffect(() => {
    const loadEvents = window.setTimeout(() => {
      setConfirmedEvents(readConfirmedEvents());
      setHasLoadedConfirmedEvents(true);
    }, 0);

    return () => window.clearTimeout(loadEvents);
  }, []);

  useEffect(() => {
    if (!hasLoadedConfirmedEvents) {
      return;
    }

    if (confirmedEvents.length === 0) {
      window.localStorage.removeItem(CONFIRMED_EVENTS_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      CONFIRMED_EVENTS_STORAGE_KEY,
      JSON.stringify(confirmedEvents),
    );
  }, [confirmedEvents, hasLoadedConfirmedEvents]);

  useEffect(() => {
    if (!isUpdateModalOpen) {
      return;
    }

    const dialog = updateModalRef.current;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousBodyOverflow = document.body.style.overflow;
    const focusTitle = window.setTimeout(
      () => updateModalTitleRef.current?.focus(),
      0,
    );

    document.body.style.overflow = "hidden";

    function handleDialogKeyDown(event: KeyboardEvent) {
      if (!dialog) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setCandidateItems([]);
        setOperationalInput("");
        setExtractStatus({ state: "idle" });
        setValidationError(null);
        setManualValidationError(null);
        setUpdateStep("capture");
        setInputMode("text");
        setIsUpdateModalOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENT_SELECTOR),
      ).filter((element) => element.offsetParent !== null);

      if (focusableElements.length === 0) {
        event.preventDefault();
        updateModalTitleRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (
        event.shiftKey &&
        (activeElement === firstElement ||
          activeElement === updateModalTitleRef.current)
      ) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleDialogKeyDown);

    return () => {
      window.clearTimeout(focusTitle);
      document.removeEventListener("keydown", handleDialogKeyDown);
      document.body.style.overflow = previousBodyOverflow;

      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [isUpdateModalOpen]);

  useEffect(() => {
    if (!confirmationMessage) {
      return;
    }

    const clearMessage = window.setTimeout(
      () => setConfirmationMessage(null),
      4000,
    );

    return () => window.clearTimeout(clearMessage);
  }, [confirmationMessage]);

  function resetUpdateWorkflow() {
    setOperationalInput("");
    setCandidateItems([]);
    setValidationError(null);
    setExtractStatus({ state: "idle" });
    setManualEventType("PURCHASED");
    setManualItemName("");
    setManualQuantity("");
    setManualUnit("");
    setManualNotes("");
    setManualValidationError(null);
    setUpdateStep("capture");
    setInputMode("text");
    setStructuredQuickAction(null);
  }

  function openUpdateModal() {
    resetUpdateWorkflow();
    setIsUpdateModalOpen(true);
  }

  function closeUpdateModal() {
    resetUpdateWorkflow();
    setIsUpdateModalOpen(false);
  }

  function openInventoryQuantityUpdate(item: InventoryItem) {
    resetUpdateWorkflow();
    setInputMode("structured");
    setManualEventType("CONSUMED");
    setManualItemName(item.itemName);
    setManualQuantity("1");
    setManualUnit(item.unit ?? "");
    setStructuredQuickAction({ item });
    setIsUpdateModalOpen(true);
  }

  function selectInventoryQuantityMode(type: InventoryEventType) {
    if (!structuredQuickAction || type === "DISCARDED") {
      return;
    }

    setManualEventType(type);
    setManualQuantity(
      type === "CORRECTED" ? String(structuredQuickAction.item.quantity) : "1",
    );
    setManualValidationError(null);
  }

  async function handleTextExtraction() {
    setIsExtracting(true);
    setExtractStatus({ state: "loading" });
    setValidationError(null);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: operationalInput }),
      });
      const responseBody: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setCandidateItems([]);
        setExtractStatus({
          state: "error",
          message:
            getApiErrorMessage(responseBody) ?? "Unable to extract events.",
        });
        return;
      }

      const result = extractedCandidateItemsSchema.safeParse(
        getResponseCandidates(responseBody),
      );

      if (!result.success) {
        setCandidateItems([]);
        setExtractStatus({
          state: "error",
          message: "Extraction response failed validation.",
        });
        return;
      }

      const draftTimestamp = Date.now();
      setCandidateItems(
        result.data.map((candidate, index) => {
          const normalizedCandidate = normalizeCandidateForReview(candidate);

          return {
            ...normalizedCandidate,
            draftId: `ai-draft-${draftTimestamp}-${index}`,
            draftSource: "AI",
          };
        }),
      );
      setExtractStatus({
        state: "success",
        count: result.data.length,
      });
      setUpdateStep("review");
    } catch {
      setCandidateItems([]);
      setExtractStatus({
        state: "error",
        message: "Unable to extract events. Please try again.",
      });
    } finally {
      setIsExtracting(false);
    }
  }

  function handleUseSampleInput(note: string) {
    setOperationalInput(note);
    setExtractStatus({ state: "idle" });
    setValidationError(null);
  }

  function handleLoadSampleWorkspace() {
    if (confirmedEvents.length > 0) {
      return;
    }

    setConfirmedEvents(createSampleEvents());
    setCandidateItems([]);
    setValidationError(null);
    setConfirmationMessage(null);
    setIsUpdateModalOpen(false);
    setActiveView("overview");
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
      notes: manualNotes.trim().length > 0 ? manualNotes.trim() : undefined,
    });

    if (!result.success) {
      setManualValidationError(
        manualEventType === "CORRECTED"
          ? "Quantity must be zero or greater."
          : "Quantity must be greater than zero.",
      );
      return;
    }

    if (
      structuredQuickAction &&
      manualEventType === "CONSUMED" &&
      quantity > structuredQuickAction.item.quantity
    ) {
      setManualValidationError(
        "Amount used cannot exceed the current inventory.",
      );
      return;
    }

    const normalizedCandidate = normalizeCandidateForReview(result.data);

    const draftCandidate: DraftCandidate = {
      ...normalizedCandidate,
      draftId: `structured-draft-${Date.now()}`,
      draftSource: "STRUCTURED",
    };

    setManualValidationError(null);
    setValidationError(null);

    if (structuredQuickAction) {
      setCandidateItems([draftCandidate]);
      setUpdateStep("review");
      return;
    }

    setCandidateItems((currentItems) => [...currentItems, draftCandidate]);
    setManualEventType("PURCHASED");
    setManualItemName("");
    setManualQuantity("");
    setManualUnit("");
    setManualNotes("");
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

  function updateCandidateNotes(index: number, notes: string) {
    setCandidateItems((currentItems) =>
      currentItems.map((candidate, candidateIndex) =>
        candidateIndex === index
          ? {
              ...candidate,
              notes: notes.trim().length === 0 ? undefined : notes,
            }
          : candidate,
      ),
    );
  }

  function handleRemoveCandidate(draftId: string) {
    const remainingCandidates = candidateItems.filter(
      (candidate) => candidate.draftId !== draftId,
    );

    setCandidateItems(remainingCandidates);
    setValidationError(null);

    if (remainingCandidates.length === 0) {
      setUpdateStep("capture");
    }
  }

  function handleConfirmCandidates() {
    const hasIncompleteCandidate = candidateItems.some(
      (candidate) =>
        candidate.name.trim().length === 0 ||
        candidate.quantity === undefined ||
        !Number.isFinite(candidate.quantity) ||
        !isValidEventQuantity(candidate.type, candidate.quantity),
    );

    if (hasIncompleteCandidate) {
      setValidationError("Enter an item name and quantity for each draft event.");
      return;
    }

    const result = extractedCandidateItemsSchema.safeParse(candidateItems);

    if (!result.success) {
      setValidationError("Review each draft event before confirming.");
      return;
    }

    const nowIso = new Date().toISOString();
    const events: InventoryEvent[] = result.data.map((candidate, index) => {
      const sourceDraft = candidateItems[index];
      const normalizedCandidate = normalizeCandidateForReview(candidate);

      return {
        id: `evt_${nowIso}_${index}`,
        type: candidate.type,
        itemName: normalizedCandidate.name,
        quantity: candidate.quantity ?? 1,
        unit: normalizedCandidate.unit,
        occurredAt: nowIso,
        notes: candidate.notes,
        sourceText:
          sourceDraft?.draftSource === "AI"
            ? operationalInput
            : "Structured entry",
      };
    });

    setConfirmedEvents((currentEvents) => [...currentEvents, ...events]);
    resetUpdateWorkflow();
    setConfirmationMessage(
      `${events.length} ${events.length === 1 ? "event" : "events"} confirmed.`,
    );
    setIsUpdateModalOpen(false);
  }

  function handleStartEventEdit(event: InventoryEvent) {
    setEditingEventId(event.id);
    setEventEditDraft({
      type: event.type,
      itemName: event.itemName,
      quantity: String(event.quantity),
      unit: event.unit ?? "",
    });
    setEventEditError(null);
  }

  function handleCancelEventEdit() {
    setEditingEventId(null);
    setEventEditDraft(null);
    setEventEditError(null);
  }

  function updateEventEditDraft(field: keyof EventEditDraft, value: string) {
    setEventEditDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      if (field === "type") {
        return { ...currentDraft, type: value as InventoryEventType };
      }

      return { ...currentDraft, [field]: value };
    });
  }

  function handleSaveEventEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingEventId || !eventEditDraft) {
      return;
    }

    const itemName = eventEditDraft.itemName.trim();
    const quantity = Number(eventEditDraft.quantity);

    if (itemName.length === 0) {
      setEventEditError("Enter an item name.");
      return;
    }

    if (
      eventEditDraft.quantity.trim().length === 0 ||
      !Number.isFinite(quantity) ||
      !isValidEventQuantity(eventEditDraft.type, quantity)
    ) {
      setEventEditError(
        eventEditDraft.type === "CORRECTED"
          ? "Enter a quantity of zero or greater."
          : "Enter a quantity greater than zero.",
      );
      return;
    }

    setConfirmedEvents((currentEvents) =>
      currentEvents.map((currentEvent) =>
        currentEvent.id === editingEventId
          ? {
              ...currentEvent,
              type: eventEditDraft.type,
              itemName,
              quantity,
              unit:
                eventEditDraft.unit.trim().length > 0
                  ? eventEditDraft.unit.trim()
                  : undefined,
            }
          : currentEvent,
      ),
    );
    handleCancelEventEdit();
  }

  function handleDeleteEvent(eventId: string) {
    const shouldDelete = window.confirm(
      "Delete this confirmed event? Inventory and recommendations will be recomputed.",
    );

    if (!shouldDelete) {
      return;
    }

    setConfirmedEvents((currentEvents) =>
      currentEvents.filter((event) => event.id !== eventId),
    );

    if (editingEventId === eventId) {
      handleCancelEventEdit();
    }
  }

  function handleClearEventHistory() {
    const shouldClear = window.confirm(
      "Clear all confirmed events? This will reset inventory, recommendations, and activity history.",
    );

    if (!shouldClear) {
      return;
    }

    setConfirmedEvents([]);
    handleCancelEventEdit();
  }

  async function handleGenerateActionPlan() {
    setIsGeneratingActionPlan(true);
    setActionPlanError(null);

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recommendations }),
      });
      const responseBody: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(responseBody) ??
            "Unable to generate an action plan.",
        );
      }

      const explanation = getResponseExplanation(responseBody);

      if (!explanation) {
        throw new Error("Action plan response failed validation.");
      }

      setActionPlan({ explanation, recommendationSnapshot });
    } catch (error) {
      setActionPlanError({
        message:
          error instanceof Error
            ? error.message
            : "Unable to generate an action plan.",
        recommendationSnapshot,
      });
    } finally {
      setIsGeneratingActionPlan(false);
    }
  }

  return (
    <div className="dashboard-workspace">
      <header className="app-header">
        <div>
          <p className="app-kicker">Pantry inventory workspace</p>
          <h1>InventoryOps AI</h1>
          <p className="app-principle">
            AI drafts updates. You confirm. Rules compute the recommendations.
          </p>
          <p className="app-summary">
            Turn messy pantry updates into reviewed inventory decisions.
          </p>
        </div>

        <div className="header-actions">
          {hasLoadedConfirmedEvents ? (
            <button type="button" onClick={openUpdateModal}>
              Update inventory
            </button>
          ) : null}
        </div>
      </header>

      {!hasLoadedConfirmedEvents ? (
        <section className="dashboard-loading-state" role="status">
          <p className="section-kicker">Confirmed inventory</p>
          <h2>Loading inventory...</h2>
        </section>
      ) : null}

      {hasLoadedConfirmedEvents && confirmationMessage ? (
        <p className="dashboard-success-message" role="status">
          {confirmationMessage}
        </p>
      ) : null}

      {hasLoadedConfirmedEvents && hasSampleData ? (
        <div className="sample-data-banner" role="status">
          <strong>Sample data</strong>
          <span>This workspace includes example confirmed events.</span>
        </div>
      ) : null}

      {hasLoadedConfirmedEvents && !hasConfirmedEvents ? (
        <section className="dashboard-empty-state" aria-labelledby="empty-title">
          <p className="section-kicker">Confirmed inventory</p>
          <h2 id="empty-title">Add your first inventory update.</h2>
          <p>
            AI creates draft events from messy notes. Inventory and
            recommendations update only after confirmation.
          </p>
          <div className="empty-state-actions">
            <button type="button" onClick={openUpdateModal}>
              Update inventory
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={handleLoadSampleWorkspace}
            >
              Load sample workspace
            </button>
          </div>
        </section>
      ) : null}

      {hasLoadedConfirmedEvents && hasConfirmedEvents ? (
        <>
          <nav className="workspace-nav" aria-label="Workspace views">
            {WORKSPACE_VIEWS.map((view) => (
              <button
                className={activeView === view.id ? "active" : ""}
                type="button"
                aria-current={activeView === view.id ? "page" : undefined}
                key={view.id}
                onClick={() => setActiveView(view.id)}
              >
                {view.label}
              </button>
            ))}
          </nav>

          {activeView === "overview" ? (
            <>
              <section className="overview-grid" aria-label="Inventory overview">
                <OverviewCard label="Tracked items" value={projectedInventory.length} />
                <OverviewCard label="Need restock" value={restockCount} tone="alert" />
                <OverviewCard
                  label="High stock"
                  value={duplicateRiskCount}
                  tone="neutral"
                />
                <OverviewCard
                  label="Confirmed events"
                  value={confirmedEvents.length}
                />
              </section>

              <section className="dashboard-section priority-section">
                <div className="section-heading">
                  <div>
                    <p className="section-kicker">Computed recommendations</p>
                    <h2>Priority actions</h2>
                  </div>
                  <p>Computed from confirmed events.</p>
                </div>

                {priorityRecommendations.length > 0 ? (
                  <div className="recommendation-list">
                    {priorityRecommendations.map(
                      ({ actionLabel, recommendation }) => (
                        <article
                          className="recommendation-row"
                          key={recommendation.id}
                        >
                          <h3>{recommendation.itemName}</h3>
                          <span
                            className={`action-badge ${getRecommendationTone(recommendation.type)}`}
                          >
                            {actionLabel}
                          </span>
                          <p className="recommendation-reason">
                            {getRecommendationReason(
                              recommendation,
                              projectedInventory,
                            )}
                          </p>
                          <div className="recommendation-meta">
                            <span>Audit details</span>
                            <span>Score {recommendation.score}</span>
                            <span>
                              Rule:{" "}
                              {recommendation.factors[0]?.label ?? "Not provided"}
                            </span>
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="section-empty-state">
                    No priority actions for the current inventory.
                  </p>
                )}
              </section>
            </>
          ) : null}

          {activeView === "inventory" ? (
            <section
              className="view-panel inventory-view"
              aria-labelledby="inventory-view-title"
            >
              <div className="view-heading">
                <div>
                  <p className="section-kicker">Computed inventory</p>
                  <h2 id="inventory-view-title">Current inventory</h2>
                  <p>
                    Current quantities are computed from confirmed events.
                    Record an update to change inventory.
                  </p>
                </div>
                <span>{projectedInventory.length} active items</span>
              </div>

              {projectedInventory.length > 0 ? (
                <div
                  className="inventory-table inventory-table-full"
                  role="table"
                  aria-label="Current inventory"
                >
                  <div className="inventory-table-header" role="row">
                    <span role="columnheader">Item</span>
                    <span role="columnheader">On hand</span>
                    <span role="columnheader">Status</span>
                    <span role="columnheader">Last updated</span>
                  </div>
                  {projectedInventory.map((item) => {
                    const status = getInventoryStatus(item, recommendations);

                    return (
                      <div
                        className="inventory-table-row"
                        key={`${item.itemName}-${item.unit ?? ""}`}
                        role="row"
                      >
                        <span role="cell">{item.itemName}</span>
                        <div
                          className="inventory-on-hand"
                          role="cell"
                          aria-label={`${item.quantity} ${item.unit ?? "units"} of ${item.itemName} on hand`}
                        >
                          <span>
                            <strong>{item.quantity}</strong> {item.unit ?? "units"}
                          </span>
                          <button
                            className="secondary-button compact-button"
                            type="button"
                            aria-label={`Update quantity for ${item.itemName}`}
                            onClick={() => openInventoryQuantityUpdate(item)}
                          >
                            Update quantity
                          </button>
                        </div>
                        <span
                          className={`status-badge ${status.tone}`}
                          role="cell"
                        >
                          {status.label}
                        </span>
                        <time dateTime={item.lastUpdatedAt} role="cell">
                          {formatDisplayDateTime(item.lastUpdatedAt)}
                        </time>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="section-empty-state">
                  No items are currently in inventory.
                </p>
              )}
            </section>
          ) : null}

          {activeView === "overview" ? (
            <section className="dashboard-section action-plan-section">
            <div className="section-heading">
              <div>
                <p className="section-kicker">AI action plan</p>
                <h2>Suggested next steps</h2>
              </div>
              <p>Based on computed recommendations.</p>
            </div>
            <div className="action-plan-content">
              <div>
                  <p className="section-description">
                  Create a short checklist from the recommendations above.
                  </p>
              </div>
              {recommendations.length > 0 ? (
                <div className="action-plan-controls">
                  <button
                    type="button"
                    disabled={isGeneratingActionPlan}
                    onClick={handleGenerateActionPlan}
                  >
                    {isGeneratingActionPlan
                      ? "Summarizing..."
                      : currentActionPlan
                        ? "Refresh summary"
                        : "Summarize recommendations"}
                  </button>
                  {currentActionPlan ? (
                    <p className="action-plan-output">{currentActionPlan}</p>
                  ) : null}
                  {currentActionPlanError ? (
                    <p className="action-plan-error" role="alert">
                      {currentActionPlanError}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="section-empty-state">
                  No computed recommendations are available yet.
                </p>
              )}
            </div>
            </section>
          ) : null}

          {activeView === "overview" ? (
            <div className="overview-previews">
              <section className="dashboard-section preview-section">
                <div className="section-heading">
                  <div>
                    <p className="section-kicker">Computed inventory</p>
                    <h2>Current inventory</h2>
                  </div>
                  <button
                    className="secondary-button compact-button"
                    type="button"
                    onClick={() => setActiveView("inventory")}
                  >
                    View all {projectedInventory.length} items
                  </button>
                </div>

                {projectedInventory.length > 0 ? (
                  <div className="inventory-preview-list">
                    {projectedInventory.slice(0, 4).map((item) => {
                      const status = getInventoryStatus(item, recommendations);

                      return (
                        <article
                          className="inventory-preview-row"
                          key={`${item.itemName}-${item.unit ?? ""}`}
                        >
                          <strong>{item.itemName}</strong>
                          <span>
                            {item.quantity} {item.unit ?? "units"}
                          </span>
                          <span className={`status-badge ${status.tone}`}>
                            {status.label}
                          </span>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="section-empty-state">
                    No items are currently in inventory.
                  </p>
                )}
              </section>

              <section className="dashboard-section preview-section">
                <div className="section-heading">
                  <div>
                    <p className="section-kicker">Confirmed events</p>
                    <h2>Recent activity</h2>
                  </div>
                  <button
                    className="secondary-button compact-button"
                    type="button"
                    onClick={() => setActiveView("activity")}
                  >
                    View all {confirmedEvents.length} events
                  </button>
                </div>

                <div className="activity-preview-list">
                  {recentEvents.slice(0, 4).map((event) => (
                    <article className="activity-preview-row" key={event.id}>
                      <div>
                        <strong>{event.itemName}</strong>
                        <span>{formatEventType(event.type)}</span>
                      </div>
                      <time dateTime={event.occurredAt}>
                        {formatDisplayDateTime(event.occurredAt)}
                      </time>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {activeView === "activity" ? (
            <section className="view-panel activity-view" aria-labelledby="activity-view-title">
            <div className="view-heading">
              <div>
                <p className="section-kicker">Confirmed events</p>
                <h2 id="activity-view-title">Activity log</h2>
                <p>
                  Confirmed events are the source of truth for inventory and
                  recommendations. Editing history recalculates the current state.
                </p>
              </div>
              <button
                className="danger-button compact-button"
                type="button"
                onClick={handleClearEventHistory}
              >
                Clear history
              </button>
            </div>

            <div className="activity-list">
              {recentEvents.map((event) =>
                editingEventId === event.id && eventEditDraft ? (
                  <form
                    className="activity-row activity-row-editing"
                    key={event.id}
                    onSubmit={handleSaveEventEdit}
                  >
                    <div className="event-edit-fields">
                      <label>
                        Event type
                        <select
                          value={eventEditDraft.type}
                          onChange={(inputEvent) =>
                            updateEventEditDraft("type", inputEvent.target.value)
                          }
                        >
                          {EVENT_TYPE_OPTIONS.map((type) => (
                            <option key={type} value={type}>
                              {formatEventType(type)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Item name
                        <input
                          type="text"
                          value={eventEditDraft.itemName}
                          onChange={(inputEvent) =>
                            updateEventEditDraft("itemName", inputEvent.target.value)
                          }
                        />
                      </label>
                      <div className="quantity-field">
                        <span>{getQuantityFieldLabel(eventEditDraft.type)}</span>
                        <QuantityControl
                          ariaLabel={getQuantityFieldLabel(eventEditDraft.type)}
                          allowZero={eventEditDraft.type === "CORRECTED"}
                          value={eventEditDraft.quantity}
                          onChange={(value) =>
                            updateEventEditDraft("quantity", value)
                          }
                        />
                      </div>
                      <label>
                        Unit
                        <input
                          type="text"
                          value={eventEditDraft.unit}
                          onChange={(inputEvent) =>
                            updateEventEditDraft("unit", inputEvent.target.value)
                          }
                        />
                      </label>
                    </div>
                    <div className="row-actions">
                      <button className="compact-button" type="submit">
                        Save
                      </button>
                      <button
                        className="secondary-button compact-button"
                        type="button"
                        onClick={handleCancelEventEdit}
                      >
                        Cancel
                      </button>
                    </div>
                    {eventEditError ? (
                      <p className="validation-error" role="alert">
                        {eventEditError}
                      </p>
                    ) : null}
                  </form>
                ) : (
                  <article className="activity-row" key={event.id}>
                    <div>
                      <p className="event-type">{formatEventType(event.type)}</p>
                      <h3>{event.itemName}</h3>
                      <span className="event-source">
                        {getEventSourceLabel(event)}
                      </span>
                    </div>
                    <span>
                      {event.quantity}
                      {event.unit ? ` ${event.unit}` : ""}
                    </span>
                    <time dateTime={event.occurredAt}>
                      {formatDisplayDateTime(event.occurredAt)}
                    </time>
                    <div className="row-actions">
                      <button
                        className="secondary-button compact-button"
                        type="button"
                        aria-label={`Edit confirmed event for ${event.itemName}`}
                        onClick={() => handleStartEventEdit(event)}
                      >
                        Edit event
                      </button>
                      <button
                        className="danger-button compact-button"
                        type="button"
                        aria-label={`Delete confirmed event for ${event.itemName}`}
                        onClick={() => handleDeleteEvent(event.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ),
              )}
            </div>
            </section>
          ) : null}
        </>
      ) : null}

      {isUpdateModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="update-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="update-modal-title"
            ref={updateModalRef}
          >
            <header className="modal-header">
              <div>
                <p className="section-kicker">
                  {updateStep === "capture"
                    ? structuredQuickAction
                      ? "Inventory quick action"
                      : "Draft event workflow"
                    : "Review queue"}
                </p>
                <h2
                  id="update-modal-title"
                  ref={updateModalTitleRef}
                  tabIndex={-1}
                >
                  {updateStep === "review"
                    ? structuredQuickAction
                      ? "Confirm inventory update"
                      : "Review draft events"
                    : structuredQuickAction
                      ? `Update ${structuredQuickAction.item.itemName} quantity`
                      : "Update inventory"}
                </h2>
                <p>
                  {updateStep === "review"
                    ? structuredQuickAction
                      ? "Review the resulting quantity before confirming."
                      : "Confirm or edit the events you want to apply to inventory."
                    : structuredQuickAction
                      ? "Choose how the quantity changed, then review the result."
                      : "Write what changed in plain English. AI will turn it into draft events for review."}
                </p>
              </div>
              <button
                className="secondary-button compact-button"
                type="button"
                aria-label="Close inventory update"
                onClick={closeUpdateModal}
              >
                Close
              </button>
            </header>

            {updateStep === "capture" ? (
              <div className="modal-content">
                {!structuredQuickAction ? (
                  <div
                    className="segmented-control"
                    role="group"
                    aria-label="Inventory update method"
                  >
                    <button
                      className={inputMode === "text" ? "active" : ""}
                      type="button"
                      aria-pressed={inputMode === "text"}
                      onClick={() => setInputMode("text")}
                    >
                      Text note
                    </button>
                    <button
                      className={inputMode === "structured" ? "active" : ""}
                      type="button"
                      aria-pressed={inputMode === "structured"}
                      onClick={() => setInputMode("structured")}
                    >
                      Structured event
                    </button>
                  </div>
                ) : null}

                {inputMode === "text" ? (
                  <section className="input-mode-panel">
                    <div className="input-mode-heading">
                      <h3>Describe what changed</h3>
                      <p>AI extracts draft events from a plain-language note.</p>
                    </div>
                    <div className="sample-note-picker">
                      <p>Try an example</p>
                      <div className="sample-note-options">
                        {SAMPLE_NOTES.map((sample) => (
                          <button
                            className="sample-note-button"
                            type="button"
                            key={sample.label}
                            onClick={() => handleUseSampleInput(sample.note)}
                          >
                            {sample.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="field-label" htmlFor="operational-input">
                      Inventory note
                    </label>
                    <textarea
                      id="operational-input"
                      value={operationalInput}
                      onChange={(event) => setOperationalInput(event.target.value)}
                      placeholder="Bought 18 eggs and 2 bottles of milk. Used 4 eggs, threw away 2 bananas, and corrected milk to 1 bottle."
                      rows={6}
                    />
                    {extractStatus.state === "success" ? (
                      <p className="extraction-status extraction-status-success">
                        {extractStatus.count} {extractStatus.count === 1 ? "draft event" : "draft events"} found.
                      </p>
                    ) : null}
                    {extractStatus.state === "error" ? (
                      <p className="extraction-status extraction-status-error" role="alert">
                        {extractStatus.message}
                      </p>
                    ) : null}
                    <p className="modal-note">
                      Draft events are reviewed before they change inventory.
                    </p>
                    <div className="modal-actions modal-footer-actions">
                      <button
                        type="button"
                        disabled={operationalInput.trim().length === 0 || isExtracting}
                        onClick={handleTextExtraction}
                      >
                        {isExtracting
                          ? "Extracting draft events..."
                          : "Extract draft events"}
                      </button>
                    </div>
                  </section>
                ) : (
                  <section className="input-mode-panel">
                    <div className="input-mode-heading">
                      <h3>
                        {structuredQuickAction
                          ? "How did the quantity change?"
                          : "Add a structured draft"}
                      </h3>
                      <p>
                        {structuredQuickAction
                          ? "This update will remain a draft until you confirm it."
                          : "Enter a precise event when the details are already known."}
                      </p>
                    </div>
                    <form onSubmit={handleAddManualCandidate}>
                      {structuredQuickAction ? (
                        <>
                          <div className="quick-action-summary">
                            <div>
                              <span>Item</span>
                              <strong>{structuredQuickAction.item.itemName}</strong>
                            </div>
                            <div>
                              <span>Current inventory</span>
                              <strong>
                                {structuredQuickAction.item.quantity}{" "}
                                {structuredQuickAction.item.unit ?? "units"}
                              </strong>
                            </div>
                          </div>
                          <div
                            className="segmented-control quick-action-mode-control"
                            role="group"
                            aria-label="Quantity update type"
                          >
                            <button
                              className={manualEventType === "CONSUMED" ? "active" : ""}
                              type="button"
                              aria-pressed={manualEventType === "CONSUMED"}
                              onClick={() =>
                                selectInventoryQuantityMode("CONSUMED")
                              }
                            >
                              Use
                            </button>
                            <button
                              className={manualEventType === "PURCHASED" ? "active" : ""}
                              type="button"
                              aria-pressed={manualEventType === "PURCHASED"}
                              onClick={() =>
                                selectInventoryQuantityMode("PURCHASED")
                              }
                            >
                              Add
                            </button>
                            <button
                              className={manualEventType === "CORRECTED" ? "active" : ""}
                              type="button"
                              aria-pressed={manualEventType === "CORRECTED"}
                              onClick={() =>
                                selectInventoryQuantityMode("CORRECTED")
                              }
                            >
                              Set total
                            </button>
                          </div>
                          <div className="quick-action-quantity">
                            <div className="quantity-field">
                              <span>{getQuantityFieldLabel(manualEventType)}</span>
                              <QuantityControl
                                ariaLabel={getQuantityFieldLabel(manualEventType)}
                                allowZero={manualEventType === "CORRECTED"}
                                value={manualQuantity}
                                onChange={setManualQuantity}
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="manual-entry-fields">
                        <div className="field-group">
                          <label>
                            Event type
                            <select
                              aria-describedby="manual-event-effect"
                              value={manualEventType}
                              onChange={(event) =>
                                setManualEventType(
                                  event.target.value as InventoryEventType,
                                )
                              }
                            >
                              {EVENT_TYPE_OPTIONS.map((type) => (
                                <option key={type} value={type}>
                                  {formatEventType(type)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <span
                            className="event-effect-helper"
                            id="manual-event-effect"
                          >
                            {getEventTypeEffect(manualEventType)}
                          </span>
                        </div>
                        <label>
                          Item name
                          <input
                            type="text"
                            value={manualItemName}
                            onChange={(event) => setManualItemName(event.target.value)}
                          />
                        </label>
                        <div className="quantity-field">
                          <span>{getQuantityFieldLabel(manualEventType)}</span>
                          <QuantityControl
                            ariaLabel={getQuantityFieldLabel(manualEventType)}
                            allowZero={manualEventType === "CORRECTED"}
                            value={manualQuantity}
                            onChange={setManualQuantity}
                          />
                        </div>
                        <label>
                          Unit
                          <input
                            type="text"
                            value={manualUnit}
                            onChange={(event) => setManualUnit(event.target.value)}
                          />
                        </label>
                        <label className="full-width-field">
                          Notes
                          <input
                            type="text"
                            value={manualNotes}
                            onChange={(event) => setManualNotes(event.target.value)}
                            placeholder="Optional context"
                          />
                        </label>
                        </div>
                      )}
                      {manualValidationError ? (
                        <p className="validation-error" role="alert">
                          {manualValidationError}
                        </p>
                      ) : null}
                      <div className="modal-actions modal-footer-actions">
                        {!structuredQuickAction && candidateItems.length > 0 ? (
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => setUpdateStep("review")}
                          >
                            Review {formatDraftCount(candidateItems.length)}
                          </button>
                        ) : null}
                        <button type="submit">
                          {structuredQuickAction
                            ? "Review update"
                            : "Add draft event"}
                        </button>
                      </div>
                    </form>
                  </section>
                )}
              </div>
            ) : (
              <div className="modal-content review-content">
                {candidateItems.length > 0 ? (
                  structuredQuickAction ? (
                    <QuickActionConfirmation
                      action={structuredQuickAction}
                      candidate={candidateItems[0]}
                      validationError={validationError}
                      onBack={() => setUpdateStep("capture")}
                      onConfirm={handleConfirmCandidates}
                    />
                  ) : (
                    <>
                    <div className="candidate-list">
                      {candidateItems.map((candidate, index) => (
                        <article className="candidate-card" key={candidate.draftId}>
                          <div className="candidate-card-header">
                            <div>
                              <p className="candidate-label">
                                Draft event {index + 1}
                              </p>
                              <span className="draft-source-label">
                                {candidate.draftSource === "AI"
                                  ? "AI extracted"
                                  : "Structured entry"}
                              </span>
                            </div>
                            <button
                              className="remove-draft-button"
                              type="button"
                              aria-label={`Remove draft event for ${candidate.name}`}
                              onClick={() =>
                                handleRemoveCandidate(candidate.draftId)
                              }
                            >
                              Remove draft
                            </button>
                          </div>
                          <div className="candidate-details">
                            <div className="field-group">
                              <label>
                                Event type
                                <select
                                  aria-describedby={`candidate-event-effect-${candidate.draftId}`}
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
                                      {formatEventType(type)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <span
                                className="event-effect-helper"
                                id={`candidate-event-effect-${candidate.draftId}`}
                              >
                                {getEventTypeEffect(candidate.type)}
                              </span>
                            </div>
                            <label>
                              Item name
                              <input
                                type="text"
                                value={candidate.name}
                                onChange={(event) => updateCandidateName(index, event.target.value)}
                              />
                            </label>
                            <div className="quantity-field">
                              <span>{getQuantityFieldLabel(candidate.type)}</span>
                              <QuantityControl
                                ariaLabel={getQuantityFieldLabel(candidate.type)}
                                allowZero={candidate.type === "CORRECTED"}
                                value={
                                  candidate.quantity === undefined
                                    ? ""
                                    : String(candidate.quantity)
                                }
                                onChange={(value) =>
                                  updateCandidateQuantity(index, value)
                                }
                              />
                            </div>
                            <label>
                              Unit
                              <input
                                type="text"
                                value={candidate.unit ?? ""}
                                onChange={(event) => updateCandidateUnit(index, event.target.value)}
                              />
                            </label>
                            <label className="full-width-field">
                              Notes
                              <input
                                type="text"
                                value={candidate.notes ?? ""}
                                onChange={(event) =>
                                  updateCandidateNotes(index, event.target.value)
                                }
                                placeholder="Optional context"
                              />
                            </label>
                          </div>
                        </article>
                      ))}
                    </div>
                    {validationError ? (
                      <p className="validation-error" role="alert">
                        {validationError}
                      </p>
                    ) : null}
                    <p className="modal-note review-boundary-note">
                      Draft events do not affect inventory until confirmed.
                    </p>
                    <div className="modal-actions review-actions modal-footer-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => setUpdateStep("capture")}
                      >
                        Back to input
                      </button>
                      <button type="button" onClick={handleConfirmCandidates}>
                        Confirm {candidateItems.length} {candidateItems.length === 1 ? "draft event" : "draft events"}
                      </button>
                    </div>
                    </>
                  )
                ) : (
                  <div className="review-empty-state">
                    <p className="section-empty-state">
                      No draft events are ready for review.
                    </p>
                    <button
                      type="button"
                      onClick={() => setUpdateStep("capture")}
                    >
                      Back to input
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function QuickActionConfirmation(input: {
  action: StructuredQuickAction;
  candidate: DraftCandidate;
  validationError: string | null;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const actionType = input.candidate.type;
  const quantity = input.candidate.quantity ?? 0;
  const currentQuantity = input.action.item.quantity;
  const resultingQuantity =
    actionType === "CORRECTED"
      ? quantity
      : actionType === "PURCHASED"
        ? currentQuantity + quantity
        : currentQuantity - quantity;
  const unit = input.action.item.unit ?? "units";
  const prompt =
    actionType === "CORRECTED"
      ? `Set ${input.action.item.itemName} to ${quantity} ${unit}?`
      : actionType === "PURCHASED"
        ? `Add ${quantity} ${unit} of ${input.action.item.itemName}?`
        : `Use ${quantity} ${unit} of ${input.action.item.itemName}?`;
  const confirmLabel =
    actionType === "CORRECTED"
      ? "Confirm new count"
      : actionType === "PURCHASED"
        ? "Confirm addition"
        : "Confirm use";

  return (
    <div className="quick-action-confirmation">
      <div className="quick-action-confirmation-body">
        <h3>{prompt}</h3>
        <div className="quick-action-result">
          <div>
            <span>Current inventory</span>
            <strong>
              {currentQuantity} {unit}
            </strong>
          </div>
          <div>
            <span>After confirmation</span>
            <strong>
              {resultingQuantity} {unit}
            </strong>
          </div>
        </div>
        <p className="modal-note">
          Confirming adds a new {formatEventType(actionType).toLowerCase()}{" "}
          event to Activity.
        </p>
        {input.validationError ? (
          <p className="validation-error" role="alert">
            {input.validationError}
          </p>
        ) : null}
      </div>
      <div className="modal-actions review-actions modal-footer-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={input.onBack}
        >
          Change update
        </button>
        <button type="button" onClick={input.onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

function QuantityControl(input: {
  value: string;
  allowZero: boolean;
  ariaLabel: string;
  onChange: (value: string) => void;
}) {
  const minimum = input.allowZero ? 0 : 1;
  const parsedQuantity = Number(input.value);
  const hasQuantity =
    input.value.trim().length > 0 && Number.isFinite(parsedQuantity);
  const currentQuantity = hasQuantity ? parsedQuantity : minimum;

  function changeQuantityBy(amount: number) {
    if (!hasQuantity) {
      input.onChange(String(amount > 0 ? Math.max(1, minimum) : minimum));
      return;
    }

    input.onChange(String(Math.max(minimum, currentQuantity + amount)));
  }

  return (
    <div className="quantity-control">
      <div className="quantity-stepper">
        <button
          className="quantity-step-button"
          type="button"
          aria-label={`Decrease ${input.ariaLabel.toLowerCase()}`}
          disabled={!hasQuantity || currentQuantity <= minimum}
          onClick={() => changeQuantityBy(-1)}
        >
          -
        </button>
        <input
          aria-label={input.ariaLabel}
          type="number"
          min={minimum}
          step="any"
          value={input.value}
          onChange={(event) => input.onChange(event.target.value)}
        />
        <button
          className="quantity-step-button"
          type="button"
          aria-label={`Increase ${input.ariaLabel.toLowerCase()}`}
          onClick={() => changeQuantityBy(1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

function OverviewCard(input: {
  label: string;
  value: number;
  tone?: "alert" | "warning" | "neutral";
}) {
  return (
    <article className={`overview-card ${input.tone ?? ""}`.trim()}>
      <p>{input.label}</p>
      <strong>{input.value}</strong>
    </article>
  );
}

function createSampleEvents(): InventoryEvent[] {
  const now = Date.now();
  const sampleEvent = (
    id: string,
    type: InventoryEventType,
    itemName: string,
    quantity: number,
    unit: string,
    hoursAgo: number,
  ): InventoryEvent => ({
    id: `sample-${id}`,
    type,
    itemName,
    quantity,
    unit,
    occurredAt: new Date(now - hoursAgo * 60 * 60 * 1000).toISOString(),
    sourceText: "Sample workspace",
  });

  return [
    sampleEvent("eggs-purchased", "PURCHASED", "eggs", 18, "count", 72),
    sampleEvent("eggs-consumed", "CONSUMED", "eggs", 4, "count", 24),
    sampleEvent("milk-purchased", "PURCHASED", "milk", 2, "bottle", 60),
    sampleEvent("milk-corrected", "CORRECTED", "milk", 1, "bottle", 6),
    sampleEvent("bananas-purchased", "PURCHASED", "bananas", 3, "count", 48),
    sampleEvent("bananas-consumed", "CONSUMED", "bananas", 2, "count", 12),
    sampleEvent("rice-purchased", "PURCHASED", "rice", 6, "bags", 36),
  ];
}

function normalizeCandidateForReview(
  candidate: ExtractedCandidateItem,
): ExtractedCandidateItem {
  const name = normalizeItemName(candidate.name);

  return {
    ...candidate,
    name,
    unit: normalizeUnit(candidate.unit),
  };
}

function isValidEventQuantity(type: InventoryEventType, quantity: number) {
  return type === "CORRECTED" ? quantity >= 0 : quantity > 0;
}

function groupRecommendations(recommendations: Recommendation[]) {
  return RECOMMENDATION_GROUPS.map((group) => ({
    ...group,
    recommendations: recommendations
      .filter((recommendation) => recommendation.type === group.type)
      .sort((first, second) => second.score - first.score),
  })).filter((group) => group.recommendations.length > 0);
}

function getRecommendationCount(
  recommendations: Recommendation[],
  type: Recommendation["type"],
) {
  return recommendations.filter((recommendation) => recommendation.type === type)
    .length;
}

function getRecommendationReason(
  recommendation: Recommendation,
  inventory: InventoryItem[],
) {
  const item = inventory.find(
    (inventoryItem) => inventoryItem.itemName === recommendation.itemName,
  );
  const quantity = item
    ? `${item.quantity} ${item.unit ?? "units"}`
    : "Current supply";

  if (recommendation.type === "RESTOCK_SOON") {
    return `${quantity} remaining.`;
  }

  if (recommendation.type === "AVOID_DUPLICATE") {
    return `${quantity} currently in stock.`;
  }

  return "This item should be used soon.";
}

function getRecommendationTone(type: Recommendation["type"]) {
  if (type === "RESTOCK_SOON") {
    return "alert";
  }

  if (type === "USE_SOON") {
    return "warning";
  }

  return "neutral";
}

function getInventoryStatus(
  item: InventoryItem,
  recommendations: Recommendation[],
) {
  const itemRecommendations = recommendations.filter(
    (recommendation) => recommendation.itemName === item.itemName,
  );

  if (itemRecommendations.some((itemRecommendation) => itemRecommendation.type === "USE_SOON")) {
    return { label: "Use soon", tone: "warning" };
  }

  if (
    itemRecommendations.some(
      (itemRecommendation) => itemRecommendation.type === "RESTOCK_SOON",
    )
  ) {
    return { label: "Restock", tone: "alert" };
  }

  if (
    itemRecommendations.some(
      (itemRecommendation) => itemRecommendation.type === "AVOID_DUPLICATE",
    )
  ) {
    return { label: "High stock", tone: "neutral" };
  }

  return { label: "In stock", tone: "positive" };
}

function formatEventType(type: InventoryEventType) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function getQuantityFieldLabel(type: InventoryEventType) {
  if (type === "PURCHASED") {
    return "Amount added";
  }

  if (type === "CONSUMED") {
    return "Amount used";
  }

  if (type === "DISCARDED") {
    return "Amount discarded";
  }

  return "New total";
}

function getEventTypeEffect(type: InventoryEventType) {
  if (type === "PURCHASED") {
    return "Adds to the current quantity.";
  }

  if (type === "CORRECTED") {
    return "Replaces the current quantity.";
  }

  return "Subtracts from the current quantity.";
}

function formatDraftCount(count: number) {
  return `${count} ${count === 1 ? "draft" : "drafts"}`;
}

function getEventSourceLabel(event: InventoryEvent) {
  if (event.sourceText === "Sample workspace") {
    return "Sample data";
  }

  if (event.sourceText === "Structured entry") {
    return "Structured entry";
  }

  return event.sourceText ? "From text note" : "Confirmed event";
}

function formatDisplayDateTime(isoDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDate));
}

function readConfirmedEvents(): InventoryEvent[] {
  try {
    const storedEvents = window.localStorage.getItem(
      CONFIRMED_EVENTS_STORAGE_KEY,
    );

    if (!storedEvents) {
      return [];
    }

    const parsedEvents: unknown = JSON.parse(storedEvents);

    if (!Array.isArray(parsedEvents)) {
      return [];
    }

    return parsedEvents.filter(isInventoryEvent);
  } catch {
    return [];
  }
}

function isInventoryEvent(value: unknown): value is InventoryEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as Partial<InventoryEvent>;

  return (
    typeof event.id === "string" &&
    EVENT_TYPE_OPTIONS.includes(event.type as InventoryEventType) &&
    typeof event.itemName === "string" &&
    typeof event.quantity === "number" &&
    Number.isFinite(event.quantity) &&
    isValidEventQuantity(event.type as InventoryEventType, event.quantity) &&
    typeof event.occurredAt === "string" &&
    (event.unit === undefined || typeof event.unit === "string") &&
    (event.notes === undefined || typeof event.notes === "string") &&
    (event.sourceText === undefined || typeof event.sourceText === "string")
  );
}

function getApiErrorMessage(responseBody: unknown) {
  if (
    responseBody &&
    typeof responseBody === "object" &&
    "error" in responseBody &&
    typeof responseBody.error === "string"
  ) {
    return responseBody.error;
  }

  return null;
}

function getResponseCandidates(responseBody: unknown) {
  if (
    responseBody &&
    typeof responseBody === "object" &&
    "candidates" in responseBody
  ) {
    return responseBody.candidates;
  }

  return undefined;
}

function getResponseExplanation(responseBody: unknown) {
  if (
    responseBody &&
    typeof responseBody === "object" &&
    "explanation" in responseBody &&
    typeof responseBody.explanation === "string" &&
    responseBody.explanation.trim().length > 0
  ) {
    return responseBody.explanation.trim();
  }

  return null;
}
