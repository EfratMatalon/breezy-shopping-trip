export type ShoppingItem = {
  id: string;
  name: string;
  qty: number;
  done: boolean;
};

export type ShoppingList = {
  id: string;
  name: string;
  items: ShoppingItem[];
  savedAt: number;
};

const HISTORY_KEY = "shoplist:history";
const CURRENT_KEY = "shoplist:current";

export function loadHistory(): ShoppingList[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveHistory(lists: ShoppingList[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(lists));
}

export function loadCurrent(): ShoppingItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CURRENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveCurrent(items: ShoppingItem[]) {
  localStorage.setItem(CURRENT_KEY, JSON.stringify(items));
}
