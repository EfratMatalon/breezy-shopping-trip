import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ============= Types =============

export type Product = {
  id: string;
  name: string;
  category?: string;
};

export type SelectedItem = {
  productId: string;
  quantity: number;
};

export type ShoppingList = {
  id: string;
  cycleId: string;
  items: SelectedItem[];
  savedAt: number;
};

export type AppState = {
  currentCycleId: string;
  selectedItems: SelectedItem[];
  shoppingLists: ShoppingList[];
  systemCatalog: Product[];
  userProducts: Product[];
  dismissedSuggestions: string[];
};

// ============= Defaults =============

const DEFAULT_CATALOG: Product[] = [
  { id: "sys-milk", name: "חלב", category: "מוצרי חלב" },
  { id: "sys-bread", name: "לחם", category: "מאפים" },
  { id: "sys-eggs", name: "ביצים", category: "מוצרי חלב" },
  { id: "sys-tomato", name: "עגבניות", category: "ירקות" },
  { id: "sys-cucumber", name: "מלפפונים", category: "ירקות" },
  { id: "sys-banana", name: "בננות", category: "פירות" },
  { id: "sys-rice", name: "אורז", category: "יבשים" },
  { id: "sys-pasta", name: "פסטה", category: "יבשים" },
];

function newCycleId(): string {
  return `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const STORAGE_KEY = "shoplist:state:v1";

function defaultState(): AppState {
  return {
    currentCycleId: newCycleId(),
    selectedItems: [],
    shoppingLists: [],
    systemCatalog: DEFAULT_CATALOG,
    userProducts: [],
    dismissedSuggestions: [],
  };
}

function loadState(): AppState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

// ============= Context =============

type AppStore = {
  state: AppState;
  // selectedItems (single source of truth)
  addSelectedItem: (productId: string, quantity?: number) => void;
  updateSelectedQuantity: (productId: string, quantity: number) => void;
  removeSelectedItem: (productId: string) => void;
  clearSelectedItems: () => void;
  // products
  addUserProduct: (name: string, category?: string) => Product;
  removeUserProduct: (productId: string) => void;
  getProduct: (productId: string) => Product | undefined;
  // suggestions
  dismissSuggestion: (productId: string) => void;
  // lists / cycles
  saveCurrentList: () => void;
  startNewCycle: () => void;
  deleteList: (listId: string) => void;
};

const AppStateContext = createContext<AppStore | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state]);

  const store = useMemo<AppStore>(() => {
    const addSelectedItem: AppStore["addSelectedItem"] = (productId, quantity = 1) =>
      setState((s) => {
        const existing = s.selectedItems.find((i) => i.productId === productId);
        if (existing) {
          return {
            ...s,
            selectedItems: s.selectedItems.map((i) =>
              i.productId === productId
                ? { ...i, quantity: i.quantity + quantity }
                : i,
            ),
          };
        }
        return {
          ...s,
          selectedItems: [...s.selectedItems, { productId, quantity }],
        };
      });

    const updateSelectedQuantity: AppStore["updateSelectedQuantity"] = (
      productId,
      quantity,
    ) =>
      setState((s) => ({
        ...s,
        selectedItems:
          quantity <= 0
            ? s.selectedItems.filter((i) => i.productId !== productId)
            : s.selectedItems.map((i) =>
                i.productId === productId ? { ...i, quantity } : i,
              ),
      }));

    const removeSelectedItem: AppStore["removeSelectedItem"] = (productId) =>
      setState((s) => ({
        ...s,
        selectedItems: s.selectedItems.filter((i) => i.productId !== productId),
      }));

    const clearSelectedItems: AppStore["clearSelectedItems"] = () =>
      setState((s) => ({ ...s, selectedItems: [] }));

    const addUserProduct: AppStore["addUserProduct"] = (name, category) => {
      const product: Product = {
        id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim(),
        category,
      };
      setState((s) => ({ ...s, userProducts: [...s.userProducts, product] }));
      return product;
    };

    const removeUserProduct: AppStore["removeUserProduct"] = (productId) =>
      setState((s) => ({
        ...s,
        userProducts: s.userProducts.filter((p) => p.id !== productId),
        selectedItems: s.selectedItems.filter((i) => i.productId !== productId),
      }));

    const getProduct: AppStore["getProduct"] = (productId) => {
      const all = [...state.systemCatalog, ...state.userProducts];
      return all.find((p) => p.id === productId);
    };

    const dismissSuggestion: AppStore["dismissSuggestion"] = (productId) =>
      setState((s) =>
        s.dismissedSuggestions.includes(productId)
          ? s
          : { ...s, dismissedSuggestions: [...s.dismissedSuggestions, productId] },
      );

    const saveCurrentList: AppStore["saveCurrentList"] = () =>
      setState((s) => {
        if (s.selectedItems.length === 0) return s;
        const list: ShoppingList = {
          id: `list-${Date.now()}`,
          cycleId: s.currentCycleId,
          items: s.selectedItems,
          savedAt: Date.now(),
        };
        return { ...s, shoppingLists: [list, ...s.shoppingLists] };
      });

    const startNewCycle: AppStore["startNewCycle"] = () =>
      setState((s) => ({
        ...s,
        currentCycleId: newCycleId(),
        selectedItems: [],
        dismissedSuggestions: [],
      }));

    const deleteList: AppStore["deleteList"] = (listId) =>
      setState((s) => ({
        ...s,
        shoppingLists: s.shoppingLists.filter((l) => l.id !== listId),
      }));

    return {
      state,
      addSelectedItem,
      updateSelectedQuantity,
      removeSelectedItem,
      clearSelectedItems,
      addUserProduct,
      removeUserProduct,
      getProduct,
      dismissSuggestion,
      saveCurrentList,
      startNewCycle,
      deleteList,
    };
  }, [state]);

  return <AppStateContext.Provider value={store}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStore {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
