/**
 * Shared Backend API Configuration
 *
 * In production on Amplify, all client API requests use same-origin relative URLs ("")
 * so requests go to `/api/...` on the same domain, hitting the Next.js reverse proxy.
 * This completely avoids Mixed Content (HTTPS -> HTTP) and CORS issues.
 *
 * In local development, NEXT_PUBLIC_API_URL can be set to point to a local backend
 * (e.g. http://localhost:8000), or if unset defaults to relative "" (Next.js proxy) or local backend.
 */

export const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  // 1. If explicitly set to empty string or "/", use same-origin relative URLs
  if (envUrl !== undefined && (envUrl.trim() === "" || envUrl.trim() === "/")) {
    return "";
  }

  // 2. Browser runtime:
  if (typeof window !== "undefined" && window.location?.hostname) {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

    // In production on Amplify, always use same-origin relative URLs
    // Never use localhost or insecure HTTP URLs from an HTTPS browser
    if (!isLocalhost) {
      return "";
    }

    // Local browser: use NEXT_PUBLIC_API_URL if specified, otherwise relative ""
    if (envUrl && envUrl.trim()) {
      return envUrl.trim().replace(/\/+$/, "");
    }
    return "";
  }

  // 3. Server-side production (Amplify SSR):
  if (process.env.NODE_ENV === "production") {
    return "";
  }

  // 4. Server-side development / test environments:
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  return "http://localhost:8000";
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Helper to construct a fully qualified backend API URL.
 */
export const buildApiUrl = (endpoint: string): string => {
  const base = getApiBaseUrl();
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
};
