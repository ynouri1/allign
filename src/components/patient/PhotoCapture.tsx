import { useState, useRef } from 'react';
import { Camera, Upload, X, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PhotoCaptureProps {
  onPhotoTaken: (photoUrl: string) => void;
  isAnalyzing?: boolean;
}

export function PhotoCapture({ onPhotoTaken, isAnalyzing = false }: PhotoCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [captureMode, setCaptureMode] = useState<'camera' | 'upload'>('camera');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 1280, height: 720 } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Erreur accès caméra:', err);
      setCaptureMode('upload');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && captureMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
      setPreviewUrl(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setPreviewUrl(dataUrl);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = () => {
    if (previewUrl) {
      onPhotoTaken(previewUrl);
      setIsOpen(false);
      setPreviewUrl(null);
    }
  };

  const handleRetake = () => {
    setPreviewUrl(null);
    if (captureMode === 'camera') {
      startCamera();
    }
  };

  return (
    <>
      <Card 
        className="group cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary/60 transition-all duration-300 p-8 flex flex-col items-center justify-center gap-4 bg-primary/5 hover:bg-primary/10"
        onClick={() => setIsOpen(true)}
      >
        <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <Camera className="h-8 w-8 text-primary-foreground" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">Prendre une photo</p>
          <p className="text-sm text-muted-foreground">Photographiez vos gouttières pour l'analyse IA</p>
        </div>
      </Card>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Capture photo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!previewUrl && (
              <div className="flex gap-2 mb-4">
                <Button 
                  variant={captureMode === 'camera' ? 'default' : 'outline'}
                  onClick={() => { setCaptureMode('camera'); startCamera(); }}
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Caméra
                </Button>
                <Button 
                  variant={captureMode === 'upload' ? 'default' : 'outline'}
                  onClick={() => { setCaptureMode('upload'); stopCamera(); }}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importer
                </Button>
              </div>
            )}

            <div className="relative aspect-[4/3] bg-muted rounded-xl overflow-hidden">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : captureMode === 'camera' ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div 
                  className="w-full h-full flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">Cliquez pour importer une photo</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            <div className="flex gap-3">
              {previewUrl ? (
                <>
                  <Button variant="outline" onClick={handleRetake} className="flex-1">
                    <X className="h-4 w-4 mr-2" />
                    Reprendre
                  </Button>
                  <Button 
                    variant="gradient" 
                    onClick={handleConfirm} 
                    className="flex-1"
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {isAnalyzing ? 'Analyse...' : 'Confirmer'}
                  </Button>
                </>
              ) : captureMode === 'camera' && (
                <Button variant="gradient" onClick={capturePhoto} className="w-full">
                  <Camera className="h-4 w-4 mr-2" />
                  Capturer
                </Button>
              )}
            </div>

            <div className="bg-info/10 border border-info/20 rounded-lg p-3">
              <p className="text-sm text-info font-medium">💡 Conseils pour une bonne photo :</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                <li>• Bonne luminosité, évitez les ombres</li>
                <li>• Gouttières bien visibles, bouche ouverte</li>
                <li>• Photo de face et des côtés si possible</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
