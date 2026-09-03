import { useState, useRef, useEffect, useCallback } from 'react';
import type { LivingAvatarState } from '../components/LivingAvatar';

// Web Speech API type definitions
export interface SpeechRecognitionEvent {
  results: {
    length: number;
    [index: number]: {
      length: number;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

export interface SpeechRecognitionErrorEvent {
  error: string;
}

export interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

export function useSpeechRecognition(
  onResult: (transcript: string) => void,
  onAvatarStateChange?: (state: LivingAvatarState) => void,
) {
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const stopListening = useCallback(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    setIsListeningVoice(false);
    onAvatarStateChange?.('idle');
  }, [onAvatarStateChange]);

  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      }
    };
  }, []);

  const toggleVoiceInput = useCallback(() => {
    setErrorText(null);
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorText('Web Speech API is not supported in this browser. Please type your message.');
      return;
    }

    if (isListeningVoice) {
      stopListening();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i] && event.results[i][0]) {
            transcript += event.results[i][0].transcript;
          }
        }
        onResult(transcript);
        onAvatarStateChange?.('listening');
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListeningVoice(false);
        onAvatarStateChange?.('idle');
        if (event.error !== 'no-speech') {
          setErrorText(`Voice input error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
        onAvatarStateChange?.('idle');
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
      setIsListeningVoice(true);
      onAvatarStateChange?.('listening');
    } catch {
      setIsListeningVoice(false);
      setErrorText('Failed to start voice recognition.');
    }
  }, [isListeningVoice, onResult, onAvatarStateChange, stopListening]);

  return {
    isListeningVoice,
    errorText,
    setErrorText,
    toggleVoiceInput,
    stopListening,
  };
}
