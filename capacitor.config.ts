import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.alignbygn.app",
  appName: "alignbygn",
  webDir: "dist",
  // Serveur de dev (décommenter pour live reload en développement)
  // server: {
  //   url: "http://192.168.1.XXX:8080",
  //   cleartext: true,
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#F8FFFE",
      showSpinner: true,
      spinnerColor: "#0D9488",
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#0D9488",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
    Camera: {
      // iOS: description affichée dans la popup de permission
      // Configuré aussi dans Info.plist via le plugin
    },
  },
  ios: {
    scheme: "alignbygn",
    contentInset: "automatic",
    backgroundColor: "#F8FFFE",
    preferredContentMode: "mobile",
  },
  android: {
    backgroundColor: "#F8FFFE",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // mettre true en dev
  },
};

export default config;
