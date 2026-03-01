import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Capacitor native setup
import { isNative } from "@/lib/capacitor";
if (isNative) {
  import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    StatusBar.setBackgroundColor({ color: "#0D9488" }).catch(() => {});
  });
  import("@capacitor/splash-screen").then(({ SplashScreen }) => {
    SplashScreen.hide().catch(() => {});
  });
  import("@capacitor/keyboard").then(({ Keyboard }) => {
    Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => {});
  });
}

// Offline photo queue — start sync service
import("@/lib/photoSyncService").then(({ startPhotoSyncService }) => {
  startPhotoSyncService().catch((e) => console.warn("[PhotoSync] init error:", e));
});

// Production v1.1.2 - Force rebuild deployment
const BUILD_TIMESTAMP = '2026-03-01T17:35:00Z';
console.log(`🚀 AlignerTracker v1.1.2 starting... Build: ${BUILD_TIMESTAMP}`);
console.log('🔧 Force cache invalidation - new deployment');

createRoot(document.getElementById("root")!).render(<App />);
