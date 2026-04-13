const isDev = import.meta.env.DEV;

const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || (isDev ? '' : 'https://api.hasm.io'),
  wsBaseUrl: import.meta.env.VITE_WS_BASE_URL || 'wss://api.hasm.io',
};

export default config;
