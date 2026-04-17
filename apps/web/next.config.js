/** @type {import('next').NextConfig} */
const nextConfig = {
  // Load env vars from the repo root .env (two levels up from apps/web)
  // These are server-only — never exposed to the browser
  env: {
    DAYTONA_API_KEY: process.env.DAYTONA_API_KEY,
    DAYTONA_API_URL: process.env.DAYTONA_API_URL,
    DAYTONA_TARGET: process.env.DAYTONA_TARGET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    PLOTCUT_MODEL: process.env.PLOTCUT_MODEL,
  },
};

module.exports = nextConfig;
