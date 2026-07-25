"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import type { CatalogItem } from "@/services/admin/catalog";
import {
  addCatalogItemAction,
  renameCatalogItemAction,
  toggleCatalogItemAction,
} from "./actions";

type CatalogManagerProps = {
  addLabel: string;
  items: CatalogItem[];
  table: "service_categories" | "districts";
  title: string;
};

export function CatalogManager({ addLabel, items, table, title }: CatalogManagerProps) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(build: () => FormData, action: (fd: FormData) => Promise<{ ok: boolean; message: string }>) {
    setFeedback(null);
    startTransition(async () => {
      const result = await action(build());
      setFeedback(result.message);
      if (result.ok) {
        setNewName("");
        setEditingId(null);
      }
    });
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
      <h2 className="mb-4 text-lg font-bold text-[var(--brand-navy)]">{title}</h2>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          className="flex-1 rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--brand-navy)] outline-none"
          disabled={pending}
          onChange={(event) => setNewName(event.target.value)}
          placeholder={addLabel}
          value={newName}
        />
        <button
          className="inline-flex items-center gap-1 rounded-md bg-[var(--brand-orange)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-orange-dark)] disabled:opacity-50"
          disabled={pending || !newName.trim()}
          onClick={() =>
            run(
              () => {
                const fd = new FormData();
                fd.set("table", table);
                fd.set("name", newName);
                return fd;
              },
              addCatalogItemAction,
            )
          }
          type="button"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Ekle
        </button>
      </div>

      {feedback ? (
        <p className="mb-3 text-xs font-semibold text-[var(--brand-orange-dark)]">{feedback}</p>
      ) : null}

      <ul className="divide-y divide-[var(--border)]">
        {items.map((item) => (
          <li className="flex flex-wrap items-center justify-between gap-2 py-2.5" key={item.id}>
            {editingId === item.id ? (
              <input
                autoFocus
                className="flex-1 rounded-md border border-[var(--border)] px-2 py-1 text-sm"
                disabled={pending}
                onChange={(event) => setEditName(event.target.value)}
                value={editName}
              />
            ) : (
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--brand-navy)]">
                {item.name}
                {!item.isActive ? (
                  <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-xs font-medium text-[var(--muted)]">
                    pasif
                  </span>
                ) : null}
              </span>
            )}

            <div className="flex items-center gap-2">
              {editingId === item.id ? (
                <>
                  <button
                    className="rounded-md bg-[var(--brand-navy)] px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    disabled={pending || !editName.trim()}
                    onClick={() =>
                      run(
                        () => {
                          const fd = new FormData();
                          fd.set("table", table);
                          fd.set("id", item.id);
                          fd.set("name", editName);
                          return fd;
                        },
                        renameCatalogItemAction,
                      )
                    }
                    type="button"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    className="rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs"
                    disabled={pending}
                    onClick={() => setEditingId(null)}
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--brand-navy)] hover:bg-[var(--surface-soft)]"
                    disabled={pending}
                    onClick={() => {
                      setEditingId(item.id);
                      setEditName(item.name);
                      setFeedback(null);
                    }}
                    type="button"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Düzenle
                  </button>
                  <button
                    className={
                      item.isActive
                        ? "rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface-soft)]"
                        : "rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                    }
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => {
                          const fd = new FormData();
                          fd.set("table", table);
                          fd.set("id", item.id);
                          fd.set("isActive", String(!item.isActive));
                          return fd;
                        },
                        toggleCatalogItemAction,
                      )
                    }
                    type="button"
                  >
                    {item.isActive ? "Pasifleştir" : "Aktifleştir"}
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
