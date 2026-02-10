import * as Location from 'expo-location';

export interface PermissionResult {
  granted: boolean;
  canAskAgain: boolean;
}

export async function requestForegroundLocation(): Promise<PermissionResult> {
  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  return { granted: status === 'granted', canAskAgain };
}

export async function requestBackgroundLocation(): Promise<PermissionResult> {
  const { status, canAskAgain } = await Location.requestBackgroundPermissionsAsync();
  return { granted: status === 'granted', canAskAgain };
}

export async function hasBackgroundLocationPermission(): Promise<boolean> {
  const { status } = await Location.getBackgroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch {
    return null;
  }
}

export async function getAddressFromCoords(
  lat: number,
  lng: number,
): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (results.length === 0) return null;
    const addr = results[0];
    const parts = [addr.street, addr.city, addr.region].filter(Boolean);
    return parts.join(', ') || null;
  } catch {
    return null;
  }
}
