"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SiteHeader } from "@/components/site-header";
import { createPublishedList, isFirebaseConfigured } from "@/lib/firebase/client";
import { rememberCreatedList } from "@/lib/local-history";
import { starterPacks, type StarterPack } from "@/lib/starter-packs";
import type { DraftItem } from "@/lib/types";

const emptyItem = (): DraftItem => ({ id: crypto.randomUUID(), title: "", imageUrl: "" });
const initialItems: DraftItem[] = [
  { id: "draft-1", title: "", imageUrl: "" },
  { id: "draft-2", title: "", imageUrl: "" },
  { id: "draft-3", title: "", imageUrl: "" }
];

function itemsFromNames(names: string[]): DraftItem[] {
  return names.slice(0, 40).map((name) => ({ id: crypto.randomUUID(), title: name.trim(), imageUrl: "" }));
}

function parsePastedItems(value: string) {
  const lines = value
    .split(/\n|,(?=\s*[A-Z0-9])/)
    .map((line) => line.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim())
    .filter(Boolean);
  return [...new Set(lines.map((line) => line.toLocaleLowerCase()))]
    .map((normalized) => lines.find((line) => line.toLocaleLowerCase() === normalized)!)
    .slice(0, 40);
}

function SortableDraftItem({ item, index, onChange, onRemove, removable }: {
  item: DraftItem;
  index: number;
  onChange: (id: string, field: "title" | "imageUrl", value: string) => void;
  onRemove: (id: string) => void;
  removable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li className={`draft-item ${isDragging ? "is-dragging" : ""}`} ref={setNodeRef} style={style}>
      <button className="drag-handle" type="button" aria-label={`Move item ${index + 1}`} {...attributes} {...listeners}>⠿</button>
      <span className="draft-number">{String(index + 1).padStart(2, "0")}</span>
      <div className="draft-fields">
        <label>
          <span className="sr-only">Item title</span>
          <input value={item.title} onChange={(event) => onChange(item.id, "title", event.target.value)} placeholder="Name the item" maxLength={80} />
        </label>
        <label className="image-field">
          <span className="sr-only">Optional image URL</span>
          <input value={item.imageUrl} onChange={(event) => onChange(item.id, "imageUrl", event.target.value)} placeholder="Image URL (optional)" type="url" />
        </label>
      </div>
      {removable && <button className="remove-item" type="button" onClick={() => onRemove(item.id)} aria-label={`Remove item ${index + 1}`}>×</button>}
    </li>
  );
}

export function CreateListClient() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<DraftItem[]>(initialItems);
  const [error, setError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionMessage, setSuggestionMessage] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const completeItems = useMemo(() => items.filter((item) => item.title.trim().length > 0), [items]);

  function updateItem(id: string, field: "title" | "imageUrl", value: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  function reorder(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((current) => {
      const from = current.findIndex((item) => item.id === active.id);
      const to = current.findIndex((item) => item.id === over.id);
      return arrayMove(current, from, to);
    });
  }

  function useStarterPack(pack: StarterPack) {
    setTitle(pack.title);
    setItems(itemsFromNames(pack.items));
    setSuggestions([]);
    setSuggestionMessage("");
    setError("");
  }

  function applyPastedItems() {
    const parsed = parsePastedItems(pasteValue);
    if (parsed.length < 3) {
      setError("Paste at least three item names, one per line.");
      return;
    }
    setItems(itemsFromNames(parsed));
    setPasteValue("");
    setSuggestions([]);
    setSuggestionMessage("");
    setError("");
  }

  async function findSuggestions() {
    const query = title.trim();
    if (query.length < 3) {
      setError("Name the topic first, then find a few public suggestions.");
      return;
    }
    try {
      setIsSuggesting(true);
      setError("");
      setSuggestionMessage("");
      const response = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, have: items.map((item) => item.title.trim()).filter(Boolean) })
      });
      const data = await response.json() as { items?: string[]; source?: string };
      const currentNames = new Set(items.map((item) => item.title.trim().toLocaleLowerCase()));
      const fresh = (data.items ?? []).filter((item) => !currentNames.has(item.toLocaleLowerCase()));
      setSuggestions(fresh);
      setSuggestionMessage(
        fresh.length
          ? `${fresh.length} ideas ready${data.source === "ai" ? "" : " from the built-in list"}. Add the ones that belong.`
          : "No reliable ideas for that topic yet. Paste a list instead."
      );
    } catch {
      setSuggestionMessage("Suggestions are unavailable right now. Paste a list instead.");
    } finally {
      setIsSuggesting(false);
    }
  }

  function addSuggestions() {
    const available = 40 - completeItems.length;
    const next = suggestions.slice(0, available);
    if (!next.length) return;
    setItems((current) => [...current.filter((item) => item.title.trim()), ...itemsFromNames(next)]);
    setSuggestions([]);
    setSuggestionMessage(`${next.length} suggestions added. Put them in your order.`);
  }

  async function publish() {
    setError("");
    const normalizedTitle = title.trim();
    const uniqueTitles = new Set(completeItems.map((item) => item.title.trim().toLowerCase()));
    if (normalizedTitle.length < 3) return setError("Give the list a title with at least three characters.");
    if (completeItems.length < 3) return setError("Add at least three named items before publishing.");
    if (completeItems.length > 40) return setError("Keep this first version focused: 40 items maximum.");
    if (uniqueTitles.size !== completeItems.length) return setError("Each item needs a distinct name.");
    if (!isFirebaseConfigured()) return setError("Firebase is not connected yet. Add the public Firebase settings, then publish from here.");

    try {
      setIsPublishing(true);
      const slug = await createPublishedList(normalizedTitle, completeItems);
      rememberCreatedList(slug, normalizedTitle);
      router.push(`/l/${slug}`);
    } catch {
      setError("That list could not be published just now. Check the Firebase setup and try again.");
      setIsPublishing(false);
    }
  }

  return (
    <main>
      <div className="page-shell create-shell">
        <SiteHeader />
        <div className="create-back"><Link href="/">← Back to the board</Link></div>
        <section className="create-layout" aria-labelledby="create-title">
          <div className="create-copy">
            <p className="eyebrow">your call</p>
            <h1 id="create-title">Make the<br />ranking.</h1>
            <p>Start with your honest order. Everyone else will get their turn afterwards.</p>
            <div className="create-notes">
              <span>3–40 items</span><span>•</span><span>no sign-up wall</span><span>•</span><span>shareable link</span>
            </div>
          </div>

          <form className="create-form" onSubmit={(event) => { event.preventDefault(); void publish(); }}>
            <label className="title-field">
              <span>What are you ranking?</span>
              <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Every AC game" maxLength={100} />
            </label>

            <section className="creation-tools" aria-label="Ways to start a ranking">
              <div className="tool-header">
                <span>Start faster</span>
                <span>free tools</span>
              </div>
              <div className="starter-packs" aria-label="Curated starter packs">
                {starterPacks.map((pack) => (
                  <button key={pack.label} type="button" onClick={() => useStarterPack(pack)}>{pack.label}</button>
                ))}
              </div>
              <div className="paste-tool">
                <label htmlFor="paste-list">Paste a rough list</label>
                <textarea id="paste-list" value={pasteValue} onChange={(event) => setPasteValue(event.target.value)} placeholder={"1. One item\n2. Another item\n3. A third item"} rows={3} />
                <button type="button" onClick={applyPastedItems}>Turn this into items →</button>
              </div>
              <div className="suggest-tool">
                <div>
                  <span>Need a nudge?</span>
                  <p>Get useful additions for the topic, then choose what makes the list.</p>
                </div>
                <button type="button" disabled={isSuggesting} onClick={() => void findSuggestions()}>{isSuggesting ? "Looking…" : "Find suggestions"}</button>
              </div>
              {(suggestionMessage || suggestions.length > 0) && (
                <div className="suggestion-result" aria-live="polite">
                  {suggestionMessage && <p>{suggestionMessage}</p>}
                  {suggestions.length > 0 && <>
                    <div className="suggestion-chips">{suggestions.map((suggestion) => <span key={suggestion}>{suggestion}</span>)}</div>
                    <button type="button" onClick={addSuggestions}>Add these suggestions</button>
                  </>}
                </div>
              )}
            </section>

            <div className="items-label-row">
              <span>Put them in order</span>
              <span>{completeItems.length} named</span>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder}>
              <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                <ol className="draft-list">
                  {items.map((item, index) => (
                    <SortableDraftItem
                      key={item.id}
                      item={item}
                      index={index}
                      onChange={updateItem}
                      onRemove={(id) => setItems((current) => current.filter((item) => item.id !== id))}
                      removable={items.length > 3}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
            <button className="add-item" type="button" onClick={() => setItems((current) => [...current, emptyItem()])}>+ Add another item</button>

            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary publish-button" disabled={isPublishing} type="submit">
              {isPublishing ? "Publishing…" : "Publish this ranking"} <span aria-hidden="true">→</span>
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
