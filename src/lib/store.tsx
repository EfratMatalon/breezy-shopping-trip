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

export const CATEGORY_ORDER: string[] = [
  "פירות",
  "ירקות",
  "מוצרי חלב",
  "מאפים",
  "בשר ודגים",
  "קפואים",
  "שתייה",
  "חטיפים ומתוקים",
  "ניקיון",
  "מוצרי יסוד",
];

const DEFAULT_CATALOG: Product[] = [
  // פירות
  { id: "sys-banana", name: "בננות", category: "פירות" },
  { id: "sys-apple", name: "תפוחים", category: "פירות" },
  { id: "sys-orange", name: "תפוזים", category: "פירות" },
  { id: "sys-grape", name: "ענבים", category: "פירות" },
  { id: "sys-watermelon", name: "אבטיח", category: "פירות" },
  { id: "sys-melon", name: "מלון", category: "פירות" },
  { id: "sys-strawberry", name: "תותים", category: "פירות" },
  { id: "sys-avocado", name: "אבוקדו", category: "פירות" },
  // ירקות
  { id: "sys-tomato", name: "עגבניות", category: "ירקות" },
  { id: "sys-cucumber", name: "מלפפונים", category: "ירקות" },
  { id: "sys-onion", name: "בצל", category: "ירקות" },
  { id: "sys-potato", name: "תפוחי אדמה", category: "ירקות" },
  { id: "sys-carrot", name: "גזר", category: "ירקות" },
  { id: "sys-pepper", name: "פלפלים", category: "ירקות" },
  { id: "sys-lettuce", name: "חסה", category: "ירקות" },
  { id: "sys-garlic", name: "שום", category: "ירקות" },
  // מוצרי חלב
  { id: "sys-milk", name: "חלב", category: "מוצרי חלב" },
  { id: "sys-white-cheese", name: "גבינה לבנה", category: "מוצרי חלב" },
  { id: "sys-cottage", name: "קוטג'", category: "מוצרי חלב" },
  { id: "sys-yogurt", name: "יוגורט", category: "מוצרי חלב" },
  { id: "sys-butter", name: "חמאה", category: "מוצרי חלב" },
  { id: "sys-cheese", name: "גבינה צהובה", category: "מוצרי חלב" },
  { id: "sys-eggs", name: "ביצים", category: "מוצרי חלב" },
  // מאפים
  { id: "sys-bread", name: "לחם", category: "מאפים" },
  { id: "sys-pita", name: "פיתות", category: "מאפים" },
  { id: "sys-rolls", name: "לחמניות", category: "מאפים" },
  { id: "sys-toast", name: "טוסט", category: "מאפים" },
  { id: "sys-challah", name: "חלה", category: "מאפים" },
  { id: "sys-bagel", name: "בייגלה", category: "מאפים" },
  // בשר ודגים
  { id: "sys-chicken", name: "חזה עוף", category: "בשר ודגים" },
  { id: "sys-beef", name: "בשר טחון", category: "בשר ודגים" },
  { id: "sys-schnitzel", name: "שניצל", category: "בשר ודגים" },
  { id: "sys-salmon", name: "סלמון", category: "בשר ודגים" },
  { id: "sys-tuna", name: "טונה", category: "בשר ודגים" },
  { id: "sys-hotdog", name: "נקניקיות", category: "בשר ודגים" },
  // קפואים
  { id: "sys-frozen-veg", name: "ירקות קפואים", category: "קפואים" },
  { id: "sys-frozen-fries", name: "צ'יפס קפוא", category: "קפואים" },
  { id: "sys-frozen-pizza", name: "פיצה קפואה", category: "קפואים" },
  { id: "sys-icecream", name: "גלידה", category: "קפואים" },
  { id: "sys-frozen-burekas", name: "בורקס קפוא", category: "קפואים" },
  { id: "sys-frozen-fish", name: "דג קפוא", category: "קפואים" },
  // שתייה
  { id: "sys-water", name: "מים מינרליים", category: "שתייה" },
  { id: "sys-cola", name: "קולה", category: "שתייה" },
  { id: "sys-juice", name: "מיץ תפוזים", category: "שתייה" },
  { id: "sys-soda", name: "סודה", category: "שתייה" },
  { id: "sys-coffee", name: "קפה", category: "שתייה" },
  { id: "sys-tea", name: "תה", category: "שתייה" },
  // חטיפים ומתוקים
  { id: "sys-chocolate", name: "שוקולד", category: "חטיפים ומתוקים" },
  { id: "sys-bamba", name: "במבה", category: "חטיפים ומתוקים" },
  { id: "sys-bisli", name: "ביסלי", category: "חטיפים ומתוקים" },
  { id: "sys-cookies", name: "עוגיות", category: "חטיפים ומתוקים" },
  { id: "sys-chips", name: "חטיף תפוצ'יפס", category: "חטיפים ומתוקים" },
  { id: "sys-wafers", name: "וופלים", category: "חטיפים ומתוקים" },
  { id: "sys-pretzels", name: "בייגלה מלוח", category: "חטיפים ומתוקים" },
  // ניקיון
  { id: "sys-dish-soap", name: "סבון כלים", category: "ניקיון" },
  { id: "sys-laundry", name: "אבקת כביסה", category: "ניקיון" },
  { id: "sys-toilet-paper", name: "נייר טואלט", category: "ניקיון" },
  { id: "sys-paper-towels", name: "מגבות נייר", category: "ניקיון" },
  { id: "sys-floor", name: "סבון רצפה", category: "ניקיון" },
  { id: "sys-trash-bags", name: "שקיות אשפה", category: "ניקיון" },
  { id: "sys-softener", name: "מרכך כביסה", category: "ניקיון" },
  // מוצרי יסוד
  { id: "sys-rice", name: "אורז", category: "מוצרי יסוד" },
  { id: "sys-pasta", name: "פסטה", category: "מוצרי יסוד" },
  { id: "sys-flour", name: "קמח", category: "מוצרי יסוד" },
  { id: "sys-sugar", name: "סוכר", category: "מוצרי יסוד" },
  { id: "sys-salt", name: "מלח", category: "מוצרי יסוד" },
  { id: "sys-oil", name: "שמן", category: "מוצרי יסוד" },
  { id: "sys-tomato-paste", name: "רסק עגבניות", category: "מוצרי יסוד" },
  { id: "sys-cornflakes", name: "קורנפלקס", category: "מוצרי יסוד" },
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
  const [state, setState] = useState<AppState>(() => defaultState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state, hydrated]);

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
