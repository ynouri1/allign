import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Sun, Focus, AlertTriangle } from 'lucide-react';
import { PhotoAngle } from '@/types/patient';

interface BrightnessStatus {
  value: number;
  status: 'too_dark' | 'good' | 'too_bright';
}

interface SharpnessStatus {
  value: number;
  status: 'blurry' | 'acceptable' | 'sharp';
}

interface PhotoGuideOverlayProps {
  brightness?: BrightnessStatus;
  sharpness?: SharpnessStatus;
  currentAngle: PhotoAngle;
  isCapturing?: boolean;
}

const ANGLE_GUIDES: Record<PhotoAngle, { guide: string; shape: 'front' | 'side' }> = {
  front: { guide: 'Centrez votre sourire dans le cadre', shape: 'front' },
  left: { guide: 'Tournez légèrement la tête vers la droite', shape: 'side' },
  right: { guide: 'Tournez légèrement la tête vers la gauche', shape: 'side' },
  occlusal: { guide: 'Inclinez la tête vers l\'arrière', shape: 'front' },
};

export function PhotoGuideOverlay({ 
  brightness, 
  sharpness, 
  currentAngle,
  isCapturing = false 
}: PhotoGuideOverlayProps) {
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    if (isCapturing) {
      setShowFlash(true);
      const timer = setTimeout(() => setShowFlash(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isCapturing]);

  const angleConfig = ANGLE_GUIDES[currentAngle];

  const getBrightnessColor = () => {
    if (!brightness) return 'text-muted-foreground';
    switch (brightness.status) {
      case 'too_dark': return 'text-warning';
      case 'too_bright': return 'text-destructive';
      case 'good': return 'text-success';
    }
  };

  const getBrightnessLabel = () => {
    if (!brightness) return 'Analyse...';
    switch (brightness.status) {
      case 'too_dark': return 'Trop sombre';
      case 'too_bright': return 'Trop lumineux';
      case 'good': return 'Bonne lumière';
    }
  };

  const getSharpnessColor = () => {
    if (!sharpness) return 'text-muted-foreground';
    switch (sharpness.status) {
      case 'blurry': return 'text-destructive';
      case 'acceptable': return 'text-warning';
      case 'sharp': return 'text-success';
    }
  };

  const getSharpnessLabel = () => {
    if (!sharpness) return 'Analyse...';
    switch (sharpness.status) {
      case 'blurry': return 'Image floue';
      case 'acceptable': return 'Acceptable';
      case 'sharp': return 'Net';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Capture flash effect */}
      {showFlash && (
        <div className="absolute inset-0 bg-white animate-pulse z-50" />
      )}

      {/* Framing guide overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Dark corners for focus */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30" />

        {/* Smile frame guide */}
        <div className="relative">
          {angleConfig.shape === 'front' ? (
            // Front view - oval/smile shape
            <div className="relative">
              <div 
                className={cn(
                  "w-56 h-36 border-2 border-dashed rounded-[50%] transition-colors duration-300",
                  brightness?.status === 'good' && sharpness?.status === 'sharp'
                    ? "border-success"
                    : "border-white/70"
                )}
              />
              {/* Corner markers */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white rounded-br" />
            </div>
          ) : (
            // Side view - profile shape
            <div className="relative">
              <div 
                className={cn(
                  "w-40 h-48 border-2 border-dashed rounded-[40%_60%_60%_40%] transition-colors duration-300",
                  brightness?.status === 'good' && sharpness?.status === 'sharp'
                    ? "border-success"
                    : "border-white/70"
                )}
              />
              {/* Arrow indicating direction */}
              <div className={cn(
                "absolute top-1/2 -translate-y-1/2 text-white/70 text-2xl",
                currentAngle === 'left' ? "-right-8" : "-left-8"
              )}>
                {currentAngle === 'left' ? '←' : '→'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Angle instruction */}
      <div className="absolute top-4 left-0 right-0 flex justify-center">
        <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm">
          {angleConfig.guide}
        </div>
      </div>

      {/* Quality indicators */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between">
        {/* Brightness indicator */}
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
          <Sun className={cn("h-4 w-4", getBrightnessColor())} />
          <div className="flex flex-col">
            <span className={cn("text-xs font-medium", getBrightnessColor())}>
              {getBrightnessLabel()}
            </span>
            {brightness && (
              <div className="h-1 w-16 bg-white/20 rounded-full overflow-hidden mt-1">
                <div 
                  className={cn(
                    "h-full transition-all duration-300 rounded-full",
                    brightness.status === 'good' ? "bg-success" :
                    brightness.status === 'too_dark' ? "bg-warning" : "bg-destructive"
                  )}
                  style={{ width: `${brightness.value}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sharpness indicator */}
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
          <Focus className={cn("h-4 w-4", getSharpnessColor())} />
          <div className="flex flex-col">
            <span className={cn("text-xs font-medium", getSharpnessColor())}>
              {getSharpnessLabel()}
            </span>
            {sharpness && (
              <div className="h-1 w-16 bg-white/20 rounded-full overflow-hidden mt-1">
                <div 
                  className={cn(
                    "h-full transition-all duration-300 rounded-full",
                    sharpness.status === 'sharp' ? "bg-success" :
                    sharpness.status === 'acceptable' ? "bg-warning" : "bg-destructive"
                  )}
                  style={{ width: `${sharpness.value}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Warning messages */}
      {(brightness?.status !== 'good' || sharpness?.status === 'blurry') && (
        <div className="absolute bottom-20 left-4 right-4">
          <div className="bg-warning/90 text-warning-foreground rounded-lg px-3 py-2 flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              {brightness?.status === 'too_dark' && "Rapprochez-vous d'une source de lumière"}
              {brightness?.status === 'too_bright' && "Éloignez-vous de la lumière directe"}
              {sharpness?.status === 'blurry' && brightness?.status === 'good' && "Maintenez le téléphone stable"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
