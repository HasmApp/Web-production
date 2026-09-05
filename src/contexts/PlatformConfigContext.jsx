import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchAppConfig } from '../services/api.js';
import { DEFAULT_HASM_FLAGS, normalizeHasmFlags } from '../utils/hasmFlags.js';

const PlatformConfigContext = createContext(null);

export function PlatformConfigProvider({ children }) {
  const [config, setConfig] = useState({});
  const [flags, setFlags] = useState(DEFAULT_HASM_FLAGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAppConfig()
      .then((data) => {
        if (cancelled) return;
        const next = data && typeof data === 'object' ? data : {};
        setConfig(next);
        setFlags(normalizeHasmFlags(next));
      })
      .catch(() => {
        if (!cancelled) {
          setConfig({});
          setFlags(DEFAULT_HASM_FLAGS);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => ({ config, flags, loading }), [config, flags, loading]);
  return (
    <PlatformConfigContext.Provider value={value}>
      {children}
    </PlatformConfigContext.Provider>
  );
}

export function usePlatformConfig() {
  const value = useContext(PlatformConfigContext);
  if (!value) throw new Error('usePlatformConfig must be used within PlatformConfigProvider');
  return value;
}
