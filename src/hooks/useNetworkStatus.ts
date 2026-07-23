import { useEffect, useState } from 'react';
import { isNetworkOnline } from '../services/network.service';

export const useNetworkStatus = (): { online: boolean } => {
  const [online, setOnline] = useState(isNetworkOnline);

  useEffect(() => {
    const sync = () => setOnline(isNetworkOnline());

    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);

    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  return { online };
};
