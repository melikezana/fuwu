"use server";

import { revalidatePath } from "next/cache";
import {
  addCatalogItem,
  deleteCatalogItem,
  renameCatalogItem,
  setCatalogItemActive,
  type CatalogActionResult,
} from "@/services/admin/catalog";

export async function addCatalogItemAction(
  formData: FormData,
): Promise<CatalogActionResult> {
  const table = String(formData.get("table") ?? "");
  const name = String(formData.get("name") ?? "");
  const result = await addCatalogItem(table, name);
  if (result.ok) revalidatePath("/admin/catalog");
  return result;
}

export async function toggleCatalogItemAction(
  formData: FormData,
): Promise<CatalogActionResult> {
  const table = String(formData.get("table") ?? "");
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("isActive") ?? "") === "true";
  const result = await setCatalogItemActive(table, id, isActive);
  if (result.ok) revalidatePath("/admin/catalog");
  return result;
}

export async function renameCatalogItemAction(
  formData: FormData,
): Promise<CatalogActionResult> {
  const table = String(formData.get("table") ?? "");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");
  const result = await renameCatalogItem(table, id, name);
  if (result.ok) revalidatePath("/admin/catalog");
  return result;
}

export async function deleteCatalogItemAction(
  formData: FormData,
): Promise<CatalogActionResult> {
  const table = String(formData.get("table") ?? "");
  const id = String(formData.get("id") ?? "");
  const result = await deleteCatalogItem(table, id);
  if (result.ok) revalidatePath("/admin/catalog");
  return result;
}
