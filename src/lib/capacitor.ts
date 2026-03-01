/**
 * Capacitor platform detection and utilities.
 *
 * Provides helpers to detect which runtime the app is executing in
 * (native iOS, native Android, or plain web browser) and exposes
 * convenience functions for native‑only operations.
 */
import { Capacitor } from "@capacitor/core";

/** True when running inside a native Capacitor shell (iOS or Android). */
export const isNative = Capacitor.isNativePlatform();

/** True when running inside a Capacitor iOS shell. */
export const isIOS = Capacitor.getPlatform() === "ios";

/** True when running inside a Capacitor Android shell. */
export const isAndroid = Capacitor.getPlatform() === "android";

/** True when running in a regular web browser (including PWA). */
export const isWeb = Capacitor.getPlatform() === "web";

/**
 * Check whether a specific Capacitor plugin is available on the current
 * platform.  Returns `false` on web when the plugin has no web fallback.
 */
export function isPluginAvailable(pluginName: string): boolean {
  return Capacitor.isPluginAvailable(pluginName);
}

/**
 * Convert a Capacitor `file://` or `content://` URI into a URL that the
 * WebView can display in an `<img>` tag.
 */
export function convertFileSrc(filePath: string): string {
  return Capacitor.convertFileSrc(filePath);
}
