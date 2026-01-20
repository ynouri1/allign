import { useState, useCallback, useRef } from 'react';
import { PhotoQualityScore, PhotoQualityIssue } from '@/types/patient';

interface BrightnessAnalysis {
  value: number;
  status: 'too_dark' | 'good' | 'too_bright';
}

interface SharpnessAnalysis {
  value: number;
  status: 'blurry' | 'acceptable' | 'sharp';
}

export function usePhotoAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Analyze brightness from image data
  const analyzeBrightness = useCallback((imageData: ImageData): BrightnessAnalysis => {
    const data = imageData.data;
    let totalBrightness = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      // Luminance formula
      const brightness = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      totalBrightness += brightness;
    }

    const avgBrightness = totalBrightness / pixelCount;
    const normalizedBrightness = Math.round((avgBrightness / 255) * 100);

    let status: BrightnessAnalysis['status'] = 'good';
    if (normalizedBrightness < 30) {
      status = 'too_dark';
    } else if (normalizedBrightness > 80) {
      status = 'too_bright';
    }

    return { value: normalizedBrightness, status };
  }, []);

  // Analyze sharpness using Laplacian variance
  const analyzeSharpness = useCallback((imageData: ImageData): SharpnessAnalysis => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Convert to grayscale
    const gray: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      gray.push(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }

    // Apply Laplacian kernel
    let laplacianSum = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const laplacian = 
          -4 * gray[idx] +
          gray[idx - 1] +
          gray[idx + 1] +
          gray[idx - width] +
          gray[idx + width];
        laplacianSum += laplacian * laplacian;
        count++;
      }
    }

    const variance = laplacianSum / count;
    // Normalize to 0-100 (typical variance range is 0-10000)
    const normalizedSharpness = Math.min(100, Math.round((variance / 500) * 100));

    let status: SharpnessAnalysis['status'] = 'sharp';
    if (normalizedSharpness < 20) {
      status = 'blurry';
    } else if (normalizedSharpness < 50) {
      status = 'acceptable';
    }

    return { value: normalizedSharpness, status };
  }, []);

  // Analyze video frame in real-time
  const analyzeVideoFrame = useCallback((video: HTMLVideoElement): { brightness: BrightnessAnalysis; sharpness: SharpnessAnalysis } | null => {
    if (!video.videoWidth || !video.videoHeight) return null;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const canvas = canvasRef.current;
    // Use smaller size for faster analysis
    const scale = 0.25;
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    return {
      brightness: analyzeBrightness(imageData),
      sharpness: analyzeSharpness(imageData),
    };
  }, [analyzeBrightness, analyzeSharpness]);

  // Full quality analysis of a captured photo
  const analyzePhotoQuality = useCallback(async (photoUrl: string): Promise<PhotoQualityScore> => {
    setIsAnalyzing(true);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
        }

        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsAnalyzing(false);
          resolve({
            brightness: 50,
            sharpness: 50,
            framing: 50,
            overall: 50,
            issues: [],
          });
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const brightness = analyzeBrightness(imageData);
        const sharpness = analyzeSharpness(imageData);

        // Simple framing analysis (check if content is centered)
        // In a real app, this would use face/mouth detection
        const framing = 70; // Placeholder

        const issues: PhotoQualityIssue[] = [];

        if (brightness.status === 'too_dark') {
          issues.push({
            type: 'too_dark',
            message: 'Photo trop sombre. Rapprochez-vous d\'une source de lumière.',
            severity: brightness.value < 20 ? 'error' : 'warning',
          });
        } else if (brightness.status === 'too_bright') {
          issues.push({
            type: 'too_bright',
            message: 'Photo surexposée. Éloignez-vous de la lumière directe.',
            severity: brightness.value > 90 ? 'error' : 'warning',
          });
        }

        if (sharpness.status === 'blurry') {
          issues.push({
            type: 'blurry',
            message: 'Photo floue. Maintenez le téléphone stable.',
            severity: sharpness.value < 10 ? 'error' : 'warning',
          });
        }

        const overall = Math.round((brightness.value + sharpness.value + framing) / 3);

        setIsAnalyzing(false);
        resolve({
          brightness: brightness.value,
          sharpness: sharpness.value,
          framing,
          overall,
          issues,
        });
      };

      img.onerror = () => {
        setIsAnalyzing(false);
        resolve({
          brightness: 0,
          sharpness: 0,
          framing: 0,
          overall: 0,
          issues: [{ type: 'bad_framing', message: 'Erreur de chargement', severity: 'error' }],
        });
      };

      img.src = photoUrl;
    });
  }, [analyzeBrightness, analyzeSharpness]);

  return {
    isAnalyzing,
    analyzeVideoFrame,
    analyzePhotoQuality,
  };
}
