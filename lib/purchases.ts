import Purchases, {
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';

// ── Replace with your RevenueCat API keys ─────────────────────────
const API_KEY = Platform.select({
  ios: 'appl_YOUR_REVENUECAT_IOS_API_KEY',
  android: 'goog_YOUR_REVENUECAT_ANDROID_API_KEY',
  default: '',
})!;

const ENTITLEMENT_ID = 'pro';

let initialized = false;

export async function initPurchases(): Promise<void> {
  if (initialized) return;
  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  await Purchases.configure({ apiKey: API_KEY });
  initialized = true;
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (e: any) {
    if (e.userCancelled) return false;
    throw e;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

export async function checkProStatus(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

export function addCustomerInfoListener(
  listener: (info: CustomerInfo) => void,
): () => void {
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}
