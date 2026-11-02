import { PayloadAction, configureStore, createAction, createSlice } from "@reduxjs/toolkit";

import { TCartItem } from "@/shared/types/shoppingCart";

import { loadState, saveState } from "./storeLocalStorage";

export type TCartState = {
  items: TCartItem[];
  isVisible: boolean;
  /** false until the saved cart has been read from localStorage after hydration */
  isRestored: boolean;
};

export type TFavoritesState = {
  ids: string[];
};

type QuantityChange = {
  productId: string;
  amount: number;
};

/**
 * The store starts empty on the server and in the browser so server-rendered HTML always matches the first
 * client render; the saved cart and favorites are restored right after hydration (see StoreProviders).
 */
export const restoreSession = createAction<{ items: TCartItem[]; favoriteIds: string[] }>("session/restore");

const initialState: TCartState = { isVisible: false, items: [], isRestored: false };

const cartSlice = createSlice({
  name: "cart",
  initialState,
  extraReducers: (builder) => {
    builder.addCase(restoreSession, (state, action) => {
      state.items = action.payload.items;
      state.isRestored = true;
    });
  },
  reducers: {
    add: (state: TCartState, action: PayloadAction<TCartItem>) => {
      const isAvailable = state.items.findIndex((item) => item.productId === action.payload.productId);
      if (isAvailable > -1) {
        state.items[isAvailable].quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
      state.isVisible = true;
    },
    toggleCart: (state: TCartState, action: PayloadAction<boolean>) => {
      state.isVisible = action.payload.valueOf();
    },
    remove: (state: TCartState, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.productId !== action.payload);
    },
    clear: (state: TCartState) => {
      state.items = [];
      state.isVisible = false;
    },
    modifyQuantity: (state: TCartState, action: PayloadAction<QuantityChange>) => {
      state.items.map((item) =>
        item.productId === action.payload.productId ? (item.quantity += action.payload.amount) : ""
      );
    },
  },
});

const favoritesInitialState: TFavoritesState = { ids: [] };

const favoritesSlice = createSlice({
  name: "favorites",
  initialState: favoritesInitialState,
  extraReducers: (builder) => {
    builder.addCase(restoreSession, (state, action) => {
      state.ids = action.payload.favoriteIds;
    });
  },
  reducers: {
    toggleFavorite: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const index = state.ids.indexOf(id);
      if (index > -1) {
        state.ids.splice(index, 1);
      } else {
        state.ids.push(id);
      }
    },
    removeFavorite: (state, action: PayloadAction<string>) => {
      state.ids = state.ids.filter((x) => x !== action.payload);
    },
  },
});

export const shoppingCartStore = configureStore({
  reducer: {
    cart: cartSlice.reducer,
    favorites: favoritesSlice.reducer,
  },
});

/** Reads the saved cart and favorites. Call once in the browser, after hydration. */
export const restoreSavedSession = () => {
  if (shoppingCartStore.getState().cart.isRestored) return;
  const saved = loadState();
  shoppingCartStore.dispatch(
    restoreSession({ items: saved.cart.items as TCartItem[], favoriteIds: saved.favorites.ids })
  );
};

shoppingCartStore.subscribe(() => {
  // never overwrite the saved session with the empty state used before restoring it
  if (shoppingCartStore.getState().cart.isRestored) saveState(shoppingCartStore.getState());
});

export type RootState = ReturnType<typeof shoppingCartStore.getState>;
export type AppDispatch = typeof shoppingCartStore.dispatch;

export const { add, remove, clear, modifyQuantity, toggleCart } = cartSlice.actions;
export const { toggleFavorite, removeFavorite } = favoritesSlice.actions;
