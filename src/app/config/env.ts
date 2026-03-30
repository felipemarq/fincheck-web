const DEFAULT_API_URL = "https://api.moneystack.com.br";

export const env = {
  apiUrl: (import.meta.env.VITE_API_URL?.trim() || DEFAULT_API_URL).replace(
    /\/+$/,
    ""
  ),
};
