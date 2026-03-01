/**
 * useNativeCamera — hook unifié capture photo natif / web.
 *
 * Sur Capacitor (iOS/Android) : utilise @capacitor/camera pour un accès
 * natif fiable à la caméra et à la galerie.
 * Sur le web : délègue au flux existant (navigator.mediaDevices / <input>).
 *
 * Retourne toujours un data‑URL JPEG pour compatibilité avec le pipeline
 * existant (usePatientPhotos, useAlignerAnalysis).
 */
import { useCallback } from "react";
import { Camera, CameraResultType, CameraSource, CameraDirection } from "@capacitor/camera";
import { isNative, isPluginAvailable } from "@/lib/capacitor";

export interface NativeCameraResult {
  dataUrl: string; // "data:image/jpeg;base64,…"
}

export interface UseNativeCameraReturn {
  /** True when the native Camera plugin is available. */
  available: boolean;

  /**
   * Take a photo with the device camera.
   * On native: opens the system camera in full screen.
   * On web: falls back to getUserMedia (should not be called — the existing
   *          MultiAngleCapture web flow handles this).
   */
  takePhoto: (direction?: CameraDirection) => Promise<NativeCameraResult>;

  /**
   * Pick a photo from the device gallery / photo library.
   * On native: opens the system photo picker.
   * On web: triggers a hidden <input type="file">.
   */
  pickFromGallery: () => Promise<NativeCameraResult>;

  /**
   * Request camera + photo library permissions.
   * Returns true if all permissions are granted.
   */
  checkPermissions: () => Promise<boolean>;
}

export function useNativeCamera(): UseNativeCameraReturn {
  const available = isNative && isPluginAvailable("Camera");

  const takePhoto = useCallback(
    async (direction: CameraDirection = CameraDirection.Front): Promise<NativeCameraResult> => {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        direction,
        width: 1280,
        height: 720,
        correctOrientation: true,
        saveToGallery: false,
        promptLabelHeader: "Photo aligneur",
        promptLabelPhoto: "Galerie",
        promptLabelPicture: "Prendre une photo",
      });

      if (!image.dataUrl) {
        throw new Error("La capture photo n'a retourné aucune donnée");
      }

      return { dataUrl: image.dataUrl };
    },
    [],
  );

  const pickFromGallery = useCallback(async (): Promise<NativeCameraResult> => {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      width: 1280,
      correctOrientation: true,
      promptLabelHeader: "Choisir une photo",
    });

    if (!image.dataUrl) {
      throw new Error("Aucune photo sélectionnée");
    }

    return { dataUrl: image.dataUrl };
  }, []);

  const checkPermissions = useCallback(async (): Promise<boolean> => {
    if (!available) return false;

    const status = await Camera.checkPermissions();

    if (status.camera === "denied" || status.photos === "denied") {
      // Demander les permissions
      const request = await Camera.requestPermissions({
        permissions: ["camera", "photos"],
      });
      return request.camera === "granted" && request.photos === "granted";
    }

    if (status.camera === "prompt" || status.photos === "prompt") {
      const request = await Camera.requestPermissions({
        permissions: ["camera", "photos"],
      });
      return request.camera === "granted" && request.photos === "granted";
    }

    return status.camera === "granted";
  }, [available]);

  return {
    available,
    takePhoto,
    pickFromGallery,
    checkPermissions,
  };
}
