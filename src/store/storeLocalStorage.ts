const localStorageName = "cartStore";

type TFavoritesPersisted = { ids: string[] };

type TPersistedState = {
  cart: {
    items: unknown[];
    isVisible: boolean;
  };
  favorites: TFavoritesPersisted;
};

export const loadState = (): TPersistedState => {
  const tempState: TPersistedState = {
    cart: {
      items: [],
      isVisible: false,
    },
    favorites: { ids: [] },
  };
  try {
    const serializedState = localStorage.getItem(localStorageName);
    if (!serializedState) return tempState;
    const parsed = JSON.parse(serializedState) as Partial<TPersistedState>;
    if (parsed.cart?.items) tempState.cart.items = parsed.cart.items;
    if (typeof parsed.cart?.isVisible === "boolean") tempState.cart.isVisible = parsed.cart.isVisible;
    if (Array.isArray(parsed.favorites?.ids)) {
      tempState.favorites.ids = parsed.favorites.ids.filter((id): id is string => typeof id === "string");
    }
    return tempState;
  } catch {
    return tempState;
  }
};
export const saveState = (state: { cart: { items: unknown[] }; favorites: TFavoritesPersisted }) => {
  try {
    const serializedState = JSON.stringify({
      // only the items are saved; UI state like an open cart drawer shouldn't come back on the next visit
      cart: { items: state.cart.items, isVisible: false },
      favorites: state.favorites,
    });
    localStorage.setItem(localStorageName, serializedState);
  } catch {
    console.error("Failed to save state");
  }
};
