import { localStorageKeys } from "../config/localStorageKeys";

export type AuthSession = {
  accessToken: string;
  refreshToken?: string | null;
};

const canUseStorage = () => typeof window !== "undefined";

const getItem = (key: string) => {
  if (!canUseStorage()) return null;

  return window.localStorage.getItem(key);
};

const setItem = (key: string, value: string) => {
  if (!canUseStorage()) return;

  window.localStorage.setItem(key, value);
};

const removeItem = (key: string) => {
  if (!canUseStorage()) return;

  window.localStorage.removeItem(key);
};

export const authStorage = {
  getAccessToken() {
    return getItem(localStorageKeys.ACCESS_TOKEN);
  },
  getRefreshToken() {
    return getItem(localStorageKeys.REFRESH_TOKEN);
  },
  hasAccessToken() {
    return Boolean(this.getAccessToken());
  },
  setSession({ accessToken, refreshToken }: AuthSession) {
    setItem(localStorageKeys.ACCESS_TOKEN, accessToken);

    if (refreshToken) {
      setItem(localStorageKeys.REFRESH_TOKEN, refreshToken);
      return;
    }

    removeItem(localStorageKeys.REFRESH_TOKEN);
  },
  clearSession() {
    removeItem(localStorageKeys.ACCESS_TOKEN);
    removeItem(localStorageKeys.REFRESH_TOKEN);
  },
  getSelectedEntityId() {
    return getItem(localStorageKeys.SELECTED_ENTITY_ID);
  },
  setSelectedEntityId(entityId: string) {
    setItem(localStorageKeys.SELECTED_ENTITY_ID, entityId);
  },
  clearSelectedEntityId() {
    removeItem(localStorageKeys.SELECTED_ENTITY_ID);
  },
};
