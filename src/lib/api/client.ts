import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosRequestHeaders,
} from "axios";

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "../auth/tokens";
import { emitAuthEvent } from "../auth/events";

const baseURL = import.meta.env.VITE_API_URL as string | undefined;

if (!baseURL) {
  console.warn("Missing VITE_API_URL; backend auth calls will fail.");
}

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 20_000,
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  const res = await axios.post(
    `${baseURL}/auth/refresh`,
    { refreshToken },
    { timeout: 20_000 },
  );

  const { accessToken, refreshToken: newRefreshToken } = res.data || {};
  if (!accessToken || !newRefreshToken) {
    throw new Error("Invalid refresh response");
  }

  setTokens({ accessToken, refreshToken: newRefreshToken });
  emitAuthEvent({ type: "TOKEN_REFRESHED" });
  return accessToken;
}

api.interceptors.request.use((config) => {
  const accessToken = getAccessToken();
  if (accessToken) {
    config.headers = config.headers ?? ({} as AxiosRequestHeaders);
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (!original || original._retry) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const data = error.response?.data as { message?: string } | undefined;
    if (
      data?.message?.includes("Email not verified") ||
      data?.message?.includes("Invalid login credentials") ||
      status !== 401
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const newAccessToken = await refreshPromise;
      refreshPromise = null;

      original.headers = original.headers ?? ({} as AxiosRequestHeaders);
      original.headers.Authorization = `Bearer ${newAccessToken}`;
      return api.request(original);
    } catch (refreshErr) {
      refreshPromise = null;
      clearTokens();
      emitAuthEvent({ type: "SIGNED_OUT" });
      return Promise.reject(refreshErr);
    }
  },
);

export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string; error?: { message?: string } }
      | undefined;
    return (
      data?.message || data?.error?.message || err.message || "Request failed"
    );
  }

  return err instanceof Error ? err.message : "Request failed";
}
