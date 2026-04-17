/**
 * Daytona SDK client — singleton instance for sandbox orchestration.
 *
 * ENV VARS (set in root .env):
 *   DAYTONA_API_KEY  — your Daytona API key (from https://app.daytona.io/dashboard/keys)
 *   DAYTONA_API_URL  — Daytona API endpoint (default: https://app.daytona.io/api)
 *   DAYTONA_TARGET   — target region: "us" | "eu" (default: "us")
 *
 * HOW IT FITS:
 *   pipeline.ts imports this client to create/manage sandboxes.
 *   Each job gets its own ephemeral sandbox that auto-deletes when done.
 */

import { Daytona } from "@daytona/sdk";

let _client: Daytona | null = null;

export function getDaytona(): Daytona {
  if (!_client) {
    const apiKey = process.env.DAYTONA_API_KEY;
    const apiUrl = process.env.DAYTONA_API_URL;
    const target = process.env.DAYTONA_TARGET ?? "us";

    if (!apiKey) {
      throw new Error(
        "DAYTONA_API_KEY is not set. Add it to .env — get one at https://app.daytona.io/dashboard/keys"
      );
    }

    _client = new Daytona({ apiKey, apiUrl, target });
  }
  return _client;
}
