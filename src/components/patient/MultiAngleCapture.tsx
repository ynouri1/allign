import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Camera, X, Volume2, VolumeX, HelpCircle, Upload, ImageIcon, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PhotoAngle, PHOTO_ANGLES } from '@/types/patient';
import { PhotoTutorial } from './PhotoTutorial';
import { PhotoGuideOverlay } from './PhotoGuideOverlay';
import { PhotoQualityCheck } from './PhotoQualityCheck';
import { usePhotoAnalysis } from '@/hooks/usePhotoAnalysis';
import { useSpeechGuidance } from '@/hooks/useSpeechGuidance';
import { useNativeCamera } from '@/hooks/useNativeCamera';
import { isNative } from '@/lib/capacitor';

interface CapturedPhoto {
  angle: PhotoAngle;
  url: string;
}

interface MultiAngleCaptureProps {
  onComplete: (photos: CapturedPhoto[]) => void;
  isAnalyzing?: boolean;
}

export function MultiAngleCapture({ onComplete, isAnalyzing = false }: MultiAngleCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentAngleIndex, setCurrentAngleIndex] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [liveAnalysis, setLiveAnalysis] = useState<{
    brightness: { value: number; status: 'too_dark' | 'good' | 'too_bright' };
    sharpness: { value: number; status: 'blurry' | 'acceptable' | 'sharp' };
  } | null>(null);
  // Track if current photo came from gallery (single photo mode)
  const [isGalleryImport, setIsGalleryImport] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { analyzeVideoFrame } = usePhotoAnalysis();
  const { isEnabled: voiceEnabled, toggle: toggleVoice, guidance, isSupported: voiceSupported } = useSpeechGuidance();
  const { available: nativeCameraAvailable, takePhoto: nativeTakePhoto, pickFromGallery: nativePickFromGallery } = useNativeCamera();

  const currentAngle = PHOTO_ANGLES[currentAngleIndex];
  const requiredAngles = PHOTO_ANGLES.filter(a => a.required);
  const isLastRequiredAngle = currentAngleIndex >= requiredAngles.length - 1;

  // Check if tutorial should be shown
  useEffect(() => {
    if (isOpen) {
      const tutorialCompleted = localStorage.getItem('photoTutorialCompleted');
      if (!tutorialCompleted) {
        setShowTutorial(true);
      }
    }
  }, [isOpen]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 1280, height: 720 } 
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Start live analysis
      analysisIntervalRef.current = setInterval(() => {
        if (videoRef.current) {
          const analysis = analyzeVideoFrame(videoRef.current);
          if (analysis) {
            setLiveAnalysis(analysis);
          }
        }
      }, 500);

    } catch (err) {
      console.error('Erreur accès caméra:', err);
    }
  }, [analyzeVideoFrame]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    setLiveAnalysis(null);
  }, []);

  // Handle dialog open/close
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      stopCamera();
      setPreviewUrl(null);
      setCapturedPhotos([]);
      setCurrentAngleIndex(0);
      setShowTutorial(false);
      setIsGalleryImport(false);
    }
  };

  // Tutorial complete
  const handleTutorialComplete = () => {
    setShowTutorial(false);
    startCamera();
    if (voiceEnabled) {
      guidance.prepareCamera();
    }
  };

  // ----- Native Capacitor capture (no live preview, uses system camera) -----
  const handleNativeCapture = useCallback(async () => {
    if (!nativeCameraAvailable) return;
    try {
      setIsCapturing(true);
      if (voiceEnabled) guidance.holdStill();
      const result = await nativeTakePhoto();
      setPreviewUrl(result.dataUrl);
      if (voiceEnabled) guidance.captured();
    } catch (err) {
      console.error('Erreur capture native:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [nativeCameraAvailable, nativeTakePhoto, voiceEnabled, guidance]);

  const handleNativeGallery = useCallback(async () => {
    if (!nativeCameraAvailable) return;
    try {
      const result = await nativePickFromGallery();
      setIsGalleryImport(true);
      setPreviewUrl(result.dataUrl);
      setCurrentAngleIndex(0);
      setCapturedPhotos([]);
      setIsOpen(true);
    } catch (err) {
      console.error('Erreur galerie native:', err);
    }
  }, [nativeCameraAvailable, nativePickFromGallery]);

  // ----- Web capture (live preview with getUserMedia) -----
  // Countdown and capture
  const startCountdown = () => {
    if (voiceEnabled) guidance.holdStill();
    
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          capturePhoto();
          return null;
        }
        if (voiceEnabled) guidance.countdown(prev - 1);
        return prev - 1;
      });
    }, 1000);
  };

  // Capture photo (web only — canvas snapshot from <video>)
  const capturePhoto = () => {
    if (!videoRef.current) return;

    setIsCapturing(true);
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    setPreviewUrl(dataUrl);
    stopCamera();
    
    if (voiceEnabled) guidance.captured();
    
    setTimeout(() => setIsCapturing(false), 200);
  };

  // Accept photo and continue
  const handleAcceptPhoto = () => {
    if (!previewUrl) return;

    // For gallery imports, treat as single front photo and complete immediately
    if (isGalleryImport) {
      const singlePhoto: CapturedPhoto = {
        angle: 'front',
        url: previewUrl,
      };
      onComplete([singlePhoto]);
      handleOpenChange(false);
      return;
    }

    // Multi-angle camera flow
    if (!currentAngle) return;

    const newPhoto: CapturedPhoto = {
      angle: currentAngle.angle,
      url: previewUrl,
    };
    
    const newCapturedPhotos = [...capturedPhotos, newPhoto];
    setCapturedPhotos(newCapturedPhotos);
    setPreviewUrl(null);

    if (isLastRequiredAngle) {
      // All required photos captured
      if (voiceEnabled) guidance.complete();
      onComplete(newCapturedPhotos);
      handleOpenChange(false);
    } else {
      // Move to next angle
      setCurrentAngleIndex(prev => prev + 1);
      startCamera();
      if (voiceEnabled) {
        const nextAngle = PHOTO_ANGLES[currentAngleIndex + 1];
        guidance.nextAngle(nextAngle.label.toLowerCase());
      }
    }
  };

  // Retake photo
  const handleRetakePhoto = () => {
    setPreviewUrl(null);
    startCamera();
  };

  // Skip current angle (only for optional ones)
  const handleSkipAngle = () => {
    if (currentAngle?.required) return;
    setCurrentAngleIndex(prev => prev + 1);
  };

  // Handle file upload from gallery - direct single photo mode
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // Set as gallery import (single photo mode)
      setIsGalleryImport(true);
      setPreviewUrl(dataUrl);
      stopCamera();
      // Reset multi-angle state
      setCurrentAngleIndex(0);
      setCapturedPhotos([]);
      setShowTutorial(false);
      // Open the dialog to show the preview
      setIsOpen(true);
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Hidden file input for gallery import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Trigger cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card 
          className="group cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary/60 transition-all duration-300 p-6 flex flex-col items-center justify-center gap-3 bg-primary/5 hover:bg-primary/10"
          onClick={() => {
            if (nativeCameraAvailable) {
              // On native: open system camera directly, then show preview dialog
              setIsOpen(true);
            } else {
              // On web: open dialog with live getUserMedia preview
              setIsOpen(true);
            }
          }}
        >
          <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            {nativeCameraAvailable ? (
              <Smartphone className="h-6 w-6 text-primary-foreground" />
            ) : (
              <Camera className="h-6 w-6 text-primary-foreground" />
            )}
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground text-sm">Caméra</p>
            <p className="text-xs text-muted-foreground">
              {nativeCameraAvailable ? 'Capture native' : 'Capture guidée'}
            </p>
          </div>
        </Card>

        <Card 
          className="group cursor-pointer border-2 border-dashed border-secondary/50 hover:border-secondary transition-all duration-300 p-6 flex flex-col items-center justify-center gap-3 bg-secondary/5 hover:bg-secondary/10"
          onClick={() => {
            if (nativeCameraAvailable) {
              handleNativeGallery();
            } else {
              fileInputRef.current?.click();
            }
          }}
        >
          <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <ImageIcon className="h-6 w-6 text-secondary-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground text-sm">Galerie</p>
            <p className="text-xs text-muted-foreground">Importer photo</p>
          </div>
        </Card>
      </div>

      {/* Capture dialog */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {showTutorial ? 'Guide de capture' : isGalleryImport ? 'Photo importée' : `Photo ${currentAngleIndex + 1}/${requiredAngles.length}`}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {voiceSupported && !showTutorial && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleVoice}
                    className="h-8 w-8"
                  >
                    {voiceEnabled ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                )}
                {!showTutorial && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowTutorial(true)}
                    className="h-8 w-8"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {showTutorial ? (
            <PhotoTutorial 
              onComplete={handleTutorialComplete}
              onSkip={() => {
                setShowTutorial(false);
                startCamera();
              }}
            />
          ) : previewUrl ? (
            <PhotoQualityCheck
              photoUrl={previewUrl}
              onAccept={handleAcceptPhoto}
              onRetake={handleRetakePhoto}
              isLastPhoto={isLastRequiredAngle}
            />
          ) : (
            <div className="space-y-4">
              {/* Progress indicator */}
              <div className="flex justify-center gap-2">
                {requiredAngles.map((angle, index) => (
                  <div
                    key={angle.angle}
                    className={cn(
                      "flex items-center justify-center h-10 w-10 rounded-full text-lg transition-all",
                      index < currentAngleIndex
                        ? "bg-success text-success-foreground"
                        : index === currentAngleIndex
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {index < currentAngleIndex ? '✓' : angle.icon}
                  </div>
                ))}
              </div>

              {/* Current angle info */}
              <div className="text-center">
                <h3 className="font-semibold text-lg">{currentAngle?.label}</h3>
                <p className="text-sm text-muted-foreground">{currentAngle?.description}</p>
              </div>

              {/* Camera view with overlay */}
              <div className="relative aspect-[4/3] bg-muted rounded-xl overflow-hidden">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className="w-full h-full object-cover"
                />
                
                <PhotoGuideOverlay
                  brightness={liveAnalysis?.brightness}
                  sharpness={liveAnalysis?.sharpness}
                  currentAngle={currentAngle?.angle || 'front'}
                  isCapturing={isCapturing}
                />

                {/* Countdown overlay */}
                {countdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="text-8xl font-bold text-white animate-pulse">
                      {countdown}
                    </span>
                  </div>
                )}
              </div>

              {/* Capture button */}
              <div className="flex gap-3">
                {nativeCameraAvailable ? (
                  <Button 
                    variant="gradient" 
                    onClick={handleNativeCapture} 
                    className="flex-1 h-14 text-lg gap-3"
                    disabled={isCapturing || isAnalyzing}
                  >
                    <Smartphone className="h-6 w-6" />
                    Capturer
                  </Button>
                ) : (
                  <Button 
                    variant="gradient" 
                    onClick={startCountdown} 
                    className="flex-1 h-14 text-lg gap-3"
                    disabled={countdown !== null || isAnalyzing}
                  >
                    <Camera className="h-6 w-6" />
                    Capturer
                  </Button>
                )}
              </div>

              {/* Tips */}
              <div className="bg-info/10 border border-info/20 rounded-lg p-3">
                <p className="text-sm text-info font-medium">💡 Conseils :</p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                  <li>• Attendez que les indicateurs soient verts</li>
                  <li>• Maintenez le téléphone stable pendant le compte à rebours</li>
                  <li>• Les gouttières doivent être bien visibles</li>
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
