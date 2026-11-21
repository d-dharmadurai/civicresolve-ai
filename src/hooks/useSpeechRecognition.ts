import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

interface UseSpeechRecognitionOptions {
  /** BCP-47 locale, e.g. "en-IN" or "ta-IN". */
  language: string;
  onTranscript: (transcript: string) => void;
  onError: () => void;
}

/**
 * Wraps the (vendor-prefixed) Web Speech API. `toggle()` returns `false` when the
 * browser has no speech support so callers can show a typed-input fallback.
 */
export function useSpeechRecognition({
  language,
  onTranscript,
  onError,
}: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Keep the latest callbacks without re-creating the recognition session.
  const callbacksRef = useRef({ onTranscript, onError });
  useEffect(() => {
    callbacksRef.current = { onTranscript, onError };
  }, [onTranscript, onError]);

  useEffect(() => {
    return () => recognitionRef.current?.abort?.();
  }, []);

  const toggle = useCallback((): boolean => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return true;
    }

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) return false;

    const recognition = new Recognition();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const combined = Array.from(event.results, (result) => result[0].transcript)
        .join(" ")
        .trim();
      setIsListening(false);
      if (combined) callbacksRef.current.onTranscript(combined);
    };
    recognition.onerror = () => {
      setIsListening(false);
      callbacksRef.current.onError();
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
    return true;
  }, [isListening, language]);

  return { isListening, toggle };
}
