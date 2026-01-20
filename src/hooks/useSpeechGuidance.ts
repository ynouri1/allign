import { useState, useCallback, useRef, useEffect } from 'react';

interface SpeechGuidanceOptions {
  enabled?: boolean;
  lang?: string;
  rate?: number;
  pitch?: number;
}

export function useSpeechGuidance(options: SpeechGuidanceOptions = {}) {
  const { 
    enabled: initialEnabled = false, 
    lang = 'fr-FR', 
    rate = 1, 
    pitch = 1 
  } = options;

  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
  }, []);

  const speak = useCallback((text: string, priority: boolean = false) => {
    if (!isEnabled || !isSupported) return;

    // Cancel current speech if priority
    if (priority && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    // Don't interrupt non-priority speech
    if (!priority && window.speechSynthesis.speaking) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isEnabled, isSupported, lang, rate, pitch]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const toggle = useCallback(() => {
    setIsEnabled(prev => !prev);
    if (isSpeaking) {
      stop();
    }
  }, [isSpeaking, stop]);

  // Pre-defined guidance messages
  const guidance = {
    welcome: () => speak("Bienvenue. Je vais vous guider pour prendre de bonnes photos de vos gouttières."),
    
    prepareCamera: () => speak("Préparez votre caméra. Trouvez un endroit bien éclairé."),
    
    goodLight: () => speak("La luminosité est bonne."),
    tooDark: () => speak("C'est trop sombre. Rapprochez-vous d'une fenêtre.", true),
    tooBright: () => speak("La lumière est trop forte. Éloignez-vous de la source lumineuse.", true),
    
    openMouth: () => speak("Ouvrez la bouche pour montrer vos gouttières."),
    holdStill: () => speak("Restez immobile."),
    
    countdown: (seconds: number) => speak(`${seconds}`),
    
    captured: () => speak("Photo prise !"),
    
    qualityGood: () => speak("Excellente photo !"),
    qualityBad: () => speak("La photo n'est pas assez nette. Voulez-vous reprendre ?"),
    
    nextAngle: (angle: string) => speak(`Maintenant, prenez une photo ${angle}.`),
    
    complete: () => speak("Parfait ! Toutes les photos ont été prises."),
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return {
    isEnabled,
    isSpeaking,
    isSupported,
    speak,
    stop,
    toggle,
    guidance,
  };
}
