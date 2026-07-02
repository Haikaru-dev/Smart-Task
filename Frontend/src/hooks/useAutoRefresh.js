import { useEffect, useRef } from 'react';

// Auto-refresh data tanpa perlu reload manual — polling berkala +
// refetch serta-merta bila tab kembali fokus/visible.
export default function useAutoRefresh(callback, intervalMs = 15000) {
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; }, [callback]);

  useEffect(() => {
    const tick = () => callbackRef.current();
    const interval = setInterval(tick, intervalMs);
    const onFocus = () => tick();
    const onVisibility = () => { if (document.visibilityState === 'visible') tick(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);
}
