import axios from "axios";
import { env } from "../config/env";
import { authStorage } from "./authStorage";

declare module "axios" {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

export const httpClient = axios.create({
  baseURL: env.apiUrl,
});

const refreshClient = axios.create({
  baseURL: env.apiUrl,
});

let refreshRequest: Promise<string | null> | null = null;

const shouldSkipRefresh = (url?: string) => url?.startsWith("/auth/");

const redirectToLogin = () => {
  if (typeof window === "undefined") return;

  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
};

const refreshAccessToken = async () => {
  const refreshToken = authStorage.getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  if (!refreshRequest) {
    refreshRequest = refreshClient
      .post<{
        accessToken: string;
        refreshToken: string;
      }>("/auth/refresh-token", {
        refreshToken,
      })
      .then(({ data }) => {
        authStorage.setSession(data);
        return data.accessToken;
      })
      .catch(() => {
        authStorage.clearSession();
        return null;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
};

httpClient.interceptors.request.use(async (config) => {
  const accessToken = authStorage.getAccessToken();
  config.headers = config.headers ?? {};

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      !originalRequest ||
      originalRequest._retry ||
      error.response?.status !== 401 ||
      shouldSkipRefresh(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const accessToken = await refreshAccessToken();

    if (!accessToken) {
      redirectToLogin();
      return Promise.reject(error);
    }

    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${accessToken}`;

    return httpClient(originalRequest);
  }
);
