// Lazy Agora RTC loader.
//
// `react-native-agora` includes native code and cannot be evaluated inside
// Expo Go or on the web. We keep the import behind a helper so the rest of
// the app can import from here without pulling the module during bundling.
//
// Consumers should call `loadAgora()` at runtime and gracefully handle the
// null result (see `app/video-call/[appointmentId].tsx` for the "requires
// dev build" fallback).

import Constants from "expo-constants";
import { Platform } from "react-native";

export type AgoraRtcModule = typeof import("react-native-agora");

// Expo Go sets `Constants.appOwnership === "expo"`. Standalone / dev builds
// return "standalone" or "guest". Web has undefined.
export function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

export function isWeb(): boolean {
  return Platform.OS === "web";
}

export function isAgoraSupported(): boolean {
  return !isExpoGo() && !isWeb();
}

/**
 * Dynamically require react-native-agora. Returns null when the environment
 * doesn't support the native module (Expo Go, web, or bundler didn't ship
 * the native code).
 */
export function loadAgora(): AgoraRtcModule | null {
  if (!isAgoraSupported()) return null;
  try {
    // Wrapping in a runtime require prevents Metro from statically evaluating
    // the module in unsupported environments and keeps bundle size low.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-agora");
    return mod as AgoraRtcModule;
  } catch (e) {
    // Native module not linked. Almost certainly running in Expo Go.
    // Return null so the caller shows the "requires dev build" UI.
    return null;
  }
}
