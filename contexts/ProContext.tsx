import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import {
  initPurchases,
  getOfferings,
  purchasePackage,
  restorePurchases,
  checkProStatus,
  addCustomerInfoListener,
} from '@/lib/purchases';

interface ProContextValue {
  isPro: boolean;
  offerings: PurchasesOfferings | null;
  loading: boolean;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

const ProContext = createContext<ProContextValue>({
  isPro: false,
  offerings: null,
  loading: true,
  purchase: async () => false,
  restore: async () => false,
  refresh: async () => {},
});

export function ProProvider({ children }: { children: ReactNode }) {
  const [isPro, setIsPro] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await initPurchases();
        const [pro, off] = await Promise.all([checkProStatus(), getOfferings()]);
        setIsPro(pro);
        setOfferings(off);
      } catch {
        // Purchases may not be available in simulator
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Listen for subscription changes
  useEffect(() => {
    const remove = addCustomerInfoListener((info) => {
      const active = info.entitlements.active['pro'] !== undefined;
      setIsPro(active);
    });
    return remove;
  }, []);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    const success = await purchasePackage(pkg);
    if (success) setIsPro(true);
    return success;
  }, []);

  const restore = useCallback(async () => {
    const success = await restorePurchases();
    if (success) setIsPro(true);
    return success;
  }, []);

  const refresh = useCallback(async () => {
    const pro = await checkProStatus();
    setIsPro(pro);
    const off = await getOfferings();
    setOfferings(off);
  }, []);

  return (
    <ProContext.Provider value={{ isPro, offerings, loading, purchase, restore, refresh }}>
      {children}
    </ProContext.Provider>
  );
}

export function usePro(): ProContextValue {
  return useContext(ProContext);
}
