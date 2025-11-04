
let config = {
  submit: {
    development: { host: "http://127.0.0.1:8888" },
    production: { host: "https://eventretrieval.oj.io.vn" }
  }
};

export async function loadConfig() {
  // TODO: Config for frontend if needed
    return config;
}

/**
 * Get DRES API base URL
 */
export function getDresApiUrl() {
  if (!config) {
    throw new Error("Config not loaded. Call loadConfig() first.");
  }

  const isDevelopment = import.meta.env.MODE === 'development';

  return isDevelopment
    ? config.submit.development.host
    : config.submit.production.host;
}