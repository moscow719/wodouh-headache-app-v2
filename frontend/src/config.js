const configuredApiUrl = import.meta.env.VITE_API_URL;

if (!configuredApiUrl) {
  throw new Error(
    'Missing VITE_API_URL. Please configure the backend API URL.'
  );
}

export const API_URL = configuredApiUrl.replace(/\/+$/, '');