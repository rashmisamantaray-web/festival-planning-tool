/**
 * Festival Planning Tool — API client.
 *
 * Layer: Frontend / API
 * Handles all HTTP requests to the backend festival endpoints.
 * Propagates X-Request-ID for request tracing.
 *
 * Dependencies: axios, types/festival
 */

import axios, { AxiosError } from "axios";
import type { AllLevelsData, TrendData } from "../types/festival";
import { apiLogger, generateRequestId } from "../lib/logger";

const API_BASE = "/festivals";
const REQUEST_ID_HEADER = "X-Request-ID";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 600_000, // 10 min for compute
});

/** Extract user-facing error message from API response. */
function extractError(e: unknown): never {
  if (e instanceof AxiosError) {
    const msg = (e.response?.data as { error?: string })?.error ?? e.message;
    apiLogger.error("API request failed", {
      status: e.response?.status,
      url: e.config?.url,
      method: e.config?.method,
      message: msg,
    });
    throw new Error(msg);
  }
  apiLogger.error("Unexpected error", { error: String(e) });
  throw e;
}

/** Add request ID to config if provided. */
function withRequestId(
  requestId: string | undefined,
  config?: Parameters<typeof api.post>[2]
) {
  const headers = { ...config?.headers } as Record<string, string>;
  if (requestId) headers[REQUEST_ID_HEADER] = requestId;
  return { ...config, headers };
}

/**
 * Run full festival impact computation.
 *
 * @param currentDate - Planning date (YYYY-MM-DD)
 * @param referenceDates - Historical comparison dates
 * @param yearKeys - Optional year filter
 * @param includeMinor - Include minor cities
 * @param requestId - Correlation ID for tracing (optional)
 * @returns All 5 levels of computed data
 * @throws Error on API failure
 */
export async function computeDates(
  currentDate: string,
  referenceDates: string[],
  yearKeys?: string[],
  includeMinor: boolean = false,
  requestId?: string
): Promise<AllLevelsData> {
  const rid = requestId ?? generateRequestId();
  apiLogger.info("Compute request", {
    requestId: rid,
    currentDate,
    referenceDates,
    includeMinor,
  });
  try {
    const { data } = await api.post<AllLevelsData>(
      "/compute",
      {
        current_date: currentDate,
        reference_dates: referenceDates,
        year_keys: yearKeys,
        include_minor: includeMinor,
      },
      withRequestId(rid)
    );
    apiLogger.info("Compute response received", {
      requestId: rid,
      storeKey: data.store_key,
    });
    return data;
  } catch (e) {
    return extractError(e);
  }
}

/**
 * Fetch D-5 to D+5 trend data for reference dates.
 *
 * @param referenceDates - Dates to compute trends for
 * @param yearKeys - Optional year filter
 * @param requestId - Correlation ID (optional)
 */
export async function fetchTrends(
  referenceDates: string[],
  yearKeys?: string[],
  requestId?: string
): Promise<TrendData> {
  const rid = requestId ?? generateRequestId();
  apiLogger.info("Trends request", { requestId: rid, referenceDates });
  try {
    const { data } = await api.post<TrendData>(
      "/trends",
      { reference_dates: referenceDates, year_keys: yearKeys },
      withRequestId(rid)
    );
    apiLogger.info("Trends response received", { requestId: rid });
    return data;
  } catch (e) {
    return extractError(e);
  }
}

/**
 * Update city-level override rows and cascade.
 *
 * @param storeKey - Session store key from compute
 * @param overrides - Row overrides by city
 * @param requestId - Correlation ID (optional)
 */
export async function updateCityOverrides(
  storeKey: string,
  overrides: Record<string, unknown>,
  requestId?: string
): Promise<AllLevelsData> {
  const rid = requestId ?? generateRequestId();
  apiLogger.debug("City overrides request", { requestId: rid, storeKey });
  try {
    const { data } = await api.put<AllLevelsData>(
      "/city/overrides",
      { store_key: storeKey, overrides },
      withRequestId(rid)
    );
    return data;
  } catch (e) {
    return extractError(e);
  }
}

/**
 * Update L2 (City-SubCat) finals and cascade.
 */
export async function updateL2Finals(
  storeKey: string,
  finals: Record<string, number>,
  requestId?: string
): Promise<Partial<AllLevelsData>> {
  const rid = requestId ?? generateRequestId();
  apiLogger.debug("L2 finals request", {
    requestId: rid,
    storeKey,
    keysCount: Object.keys(finals).length,
  });
  try {
    const { data } = await api.put<Partial<AllLevelsData>>(
      "/city-subcat/finals",
      { store_key: storeKey, finals },
      withRequestId(rid)
    );
    return data;
  } catch (e) {
    return extractError(e);
  }
}

/**
 * Update L3 (City-SubCat-CutClass) finals and cascade.
 */
export async function updateL3Finals(
  storeKey: string,
  finals: Record<string, number>,
  requestId?: string
): Promise<Partial<AllLevelsData>> {
  const rid = requestId ?? generateRequestId();
  apiLogger.debug("L3 finals request", {
    requestId: rid,
    storeKey,
    keysCount: Object.keys(finals).length,
  });
  try {
    const { data } = await api.put<Partial<AllLevelsData>>(
      "/city-subcat-cut/finals",
      { store_key: storeKey, finals },
      withRequestId(rid)
    );
    return data;
  } catch (e) {
    return extractError(e);
  }
}

/**
 * Update L4 (City-Hub) finals and cascade.
 */
export async function updateL4Finals(
  storeKey: string,
  finals: Record<string, number>,
  requestId?: string
): Promise<Partial<AllLevelsData>> {
  const rid = requestId ?? generateRequestId();
  apiLogger.debug("L4 finals request", {
    requestId: rid,
    storeKey,
    keysCount: Object.keys(finals).length,
  });
  try {
    const { data } = await api.put<Partial<AllLevelsData>>(
      "/city-hub/finals",
      { store_key: storeKey, finals },
      withRequestId(rid)
    );
    return data;
  } catch (e) {
    return extractError(e);
  }
}

/**
 * Get Excel export URL for current store.
 *
 * @param storeKey - Session store key
 * @returns Full URL for download (use as href)
 */
export function getExportUrl(storeKey: string): string {
  return `${API_BASE}/export?store_key=${encodeURIComponent(storeKey)}`;
}
