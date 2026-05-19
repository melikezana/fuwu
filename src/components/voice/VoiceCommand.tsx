"use client";

import { useState, useEffect, useCallback } from "react";
import { Mic, MicOff, AlertCircle } from "lucide-react";
import { analyticsService } from "@/services/analytics";

// Add types for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoiceCommand() {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "tr-TR"; // Default to Turkish for this marketplace

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript.toLowerCase();
          handleCommand(transcript);
          setIsListening(false);
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
          analyticsService.trackVoiceCommandUsed("error", false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        setRecognition(rec);
      } else {
        setIsSupported(false);
      }
    }
  }, []);

  const handleCommand = useCallback((command: string) => {
    let matched = false;
    
    if (command.includes("tesisatçı ara") || command.includes("tesisat")) {
      analyticsService.trackFilterUsed("category", "tesisat");
      window.location.href = "/providers?category=Tesisat";
      matched = true;
    } else if (command.includes("kadıköy ustaları")) {
      analyticsService.trackFilterUsed("district", "Kadıköy");
      window.location.href = "/providers?district=Kadıköy";
      matched = true;
    } else if (command.includes("ustaları göster")) {
      window.location.href = "/providers";
      matched = true;
    } else if (command.includes("profilleri oku")) {
      const msg = new SpeechSynthesisUtterance("Şu an sayfadaki ustaların profillerini okuyorum.");
      msg.lang = "tr-TR";
      window.speechSynthesis.speak(msg);
      matched = true;
    }

    analyticsService.trackVoiceCommandUsed(command, matched);

    if (matched) {
      // Don't block with alert if navigating
      if (!command.includes("ara") && !command.includes("göster") && !command.includes("ustaları")) {
        alert(`Komut anlaşıldı: ${command}`);
      }
    } else {
      alert(`Anlaşılamadı: ${command}`);
    }
  }, []);

  const toggleListen = () => {
    if (!isSupported || !recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (!isSupported) {
    return (
      <button 
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-full text-sm cursor-not-allowed"
        title="Tarayıcınız sesli komutu desteklemiyor"
        disabled
      >
        <AlertCircle size={16} />
        <span>Sesli Komut</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleListen}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        isListening 
          ? "bg-red-100 text-red-600 animate-pulse border border-red-200" 
          : "bg-[#FF8A00]/10 text-[#FF8A00] hover:bg-[#FF8A00]/20"
      }`}
    >
      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
      <span>{isListening ? "Dinleniyor..." : "Sesli Komut"}</span>
    </button>
  );
}
