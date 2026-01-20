import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Lightbulb, Camera, Smile, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  tips: string[];
  illustration: React.ReactNode;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    icon: <Lightbulb className="h-6 w-6" />,
    title: 'Trouvez une bonne lumière',
    description: 'Une lumière naturelle ou une pièce bien éclairée est idéale.',
    tips: [
      'Face à une fenêtre pendant la journée',
      'Évitez les contre-jours',
      'Pas de flash direct',
    ],
    illustration: (
      <div className="relative h-32 w-full flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-warning/20 to-warning/5 rounded-xl" />
        <div className="relative flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-warning/30 flex items-center justify-center animate-pulse">
            <Lightbulb className="h-8 w-8 text-warning" />
          </div>
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Smile className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: <Camera className="h-6 w-6" />,
    title: 'Positionnez votre téléphone',
    description: 'Tenez le téléphone à bout de bras, à hauteur du visage.',
    tips: [
      'Distance d\'environ 30-40 cm',
      'Téléphone stable, pas de tremblements',
      'Utilisez les deux mains si nécessaire',
    ],
    illustration: (
      <div className="relative h-32 w-full flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl" />
        <div className="relative flex flex-col items-center">
          <div className="h-20 w-12 rounded-lg bg-muted border-2 border-primary/50 flex items-center justify-center">
            <Camera className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-2 flex items-center gap-1">
            <div className="h-1 w-8 bg-primary/30 rounded" />
            <span className="text-xs text-muted-foreground">30-40 cm</span>
            <div className="h-1 w-8 bg-primary/30 rounded" />
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: <Smile className="h-6 w-6" />,
    title: 'Montrez vos gouttières',
    description: 'Ouvrez la bouche en souriant, les gouttières doivent être bien visibles.',
    tips: [
      'Écartez les lèvres pour montrer les dents',
      'Gouttières propres et en place',
      'Bouche suffisamment ouverte',
    ],
    illustration: (
      <div className="relative h-32 w-full flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-success/20 to-success/5 rounded-xl" />
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <div className="text-4xl">😁</div>
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-success text-success-foreground text-xs px-2 py-0.5 rounded-full">
            Parfait !
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: <RotateCcw className="h-6 w-6" />,
    title: 'Prenez plusieurs angles',
    description: 'Nous vous guiderons pour 3 photos : face, côté droit et côté gauche.',
    tips: [
      'Vue frontale : sourire de face',
      'Côté droit : tournez légèrement la tête',
      'Côté gauche : idem de l\'autre côté',
    ],
    illustration: (
      <div className="relative h-32 w-full flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-info/20 to-info/5 rounded-xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-lg">👈</div>
            <span className="text-xs text-muted-foreground mt-1">Gauche</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-xl">😁</div>
            <span className="text-xs text-primary font-medium mt-1">Face</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-lg">👉</div>
            <span className="text-xs text-muted-foreground mt-1">Droite</span>
          </div>
        </div>
      </div>
    ),
  },
];

interface PhotoTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function PhotoTutorial({ onComplete, onSkip }: PhotoTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      if (dontShowAgain) {
        localStorage.setItem('photoTutorialCompleted', 'true');
      }
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (dontShowAgain) {
      localStorage.setItem('photoTutorialCompleted', 'true');
    }
    onSkip();
  };

  return (
    <div className="space-y-6">
      {/* Progress dots */}
      <div className="flex justify-center gap-2">
        {TUTORIAL_STEPS.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentStep(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index === currentStep 
                ? "w-8 bg-primary" 
                : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>

      {/* Step content */}
      <Card className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground">
            {step.icon}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Étape {currentStep + 1}/{TUTORIAL_STEPS.length}</p>
            <h3 className="font-semibold text-foreground">{step.title}</h3>
          </div>
        </div>

        {/* Illustration */}
        {step.illustration}

        {/* Description */}
        <p className="text-muted-foreground">{step.description}</p>

        {/* Tips */}
        <ul className="space-y-2">
          {step.tips.map((tip, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <span className="h-5 w-5 rounded-full bg-success/20 text-success flex items-center justify-center text-xs flex-shrink-0">
                ✓
              </span>
              <span className="text-muted-foreground">{tip}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handlePrev}
          disabled={isFirstStep}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Précédent
        </Button>

        <Button
          variant="gradient"
          onClick={handleNext}
          className="gap-2"
        >
          {isLastStep ? 'Commencer' : 'Suivant'}
          {!isLastStep && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {/* Skip option */}
      <div className="flex flex-col items-center gap-3 pt-2 border-t">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="rounded border-muted-foreground/30"
          />
          Ne plus afficher ce tutoriel
        </label>
        <Button variant="link" onClick={handleSkip} className="text-muted-foreground">
          <X className="h-4 w-4 mr-1" />
          Passer le tutoriel
        </Button>
      </div>
    </div>
  );
}
