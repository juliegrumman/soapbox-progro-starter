/**
 * Centralized environment configuration.
 * Loads .env once and exports typed getters for API keys.
 */

import dotenv from "dotenv";

dotenv.config();

export function getSerpApiKey(): string | null {
  return process.env.SERPAPI_KEY?.trim() || null;
}

export function getPageSpeedApiKey(): string | null {
  return process.env.PAGESPEED_API_KEY?.trim() || null;
}
