import { apiRequest } from "./queryClient";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function saveClearcut(data: unknown) {
  return apiRequest("POST", "/api/clearcuts", data);
}

export async function savePlot(data: unknown) {
  return apiRequest("POST", "/api/plots", data);
}

export async function saveTree(data: unknown) {
  return apiRequest("POST", "/api/trees", data);
}

export async function deleteClearcut(id: string) {
  return apiRequest("DELETE", `/api/clearcuts/${id}`);
}

export async function deletePlot(id: string) {
  return apiRequest("DELETE", `/api/plots/${id}`);
}

export async function deleteTree(id: string) {
  return apiRequest("DELETE", `/api/trees/${id}`);
}

export async function exportPdf(clearcutId: string) {
  const res = await apiRequest("GET", `/api/export/pdf/${clearcutId}`);
  return res.blob();
}
