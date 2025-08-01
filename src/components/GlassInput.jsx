import React, { useState, useRef, useEffect } from "react";
import "./GlassInput.css";

const GlassInput = ({
  setIsListening,
  setTranscript,
  setAnimation,
  onSendMessage,
  onLanguageChange,
  isAvatarSpeaking,
  currentLanguage = "en"
}) => {
  const [lang, setLang] = useState(currentLanguage);
  const [inputText, setInputText] = useState("");
  const [recording, setRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);
  const isProcessingRef = useRef(false);
  const finalTranscriptRef = useRef("");

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") || currentLanguage;
    setLang(savedLang);
    onLanguageChange?.(savedLang);
  }, [currentLanguage, onLanguageChange]);

  useEffect(() => {
    localStorage.setItem("lang", lang);
    onLanguageChange?.(lang);
  }, [lang, onLanguageChange]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isAvatarSpeaking && isProcessingRef.current) {
      const timer = setTimeout(() => {
        isProcessingRef.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAvatarSpeaking]);

  const toggleLang = () => {
    const newLang = lang === "en" ? "hi" : "en";
    setLang(newLang);
  };

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  const handleTextChange = (e) => {
    setInputText(e.target.value);
    resizeTextarea();
  };

  const cleanupRecognition = () => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setRecording(false);
    setIsListening?.(false);
    setLiveTranscript("");
    setAnimation?.("idle");
    finalTranscriptRef.current = "";
  };

  const initRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support speech recognition.");
      return null;
    }

    cleanupRecognition();

    const recognition = new SpeechRecognition();
    recognition.lang = lang === "en" ? "en-US" : "hi-IN";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    finalTranscriptRef.current = "";

    recognition.onstart = () => {
      setRecording(true);
      setIsListening?.(true);
      setAnimation?.("listening");
      setLiveTranscript("");
      setTranscript?.("");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      setLiveTranscript(interim);
      setTranscript?.(interim);

      if (final.trim()) {
        finalTranscriptRef.current += final;
      }
    };

    recognition.onend = () => {
      setRecording(false);
      setIsListening?.(false);
      setLiveTranscript("");
      setAnimation?.("idle");

      const textToProcess = finalTranscriptRef.current.trim();
      if (textToProcess && onSendMessage && !isProcessingRef.current) {
        isProcessingRef.current = true;
        setInputText(textToProcess);
        setTimeout(resizeTextarea, 0);

        onSendMessage(textToProcess, lang)
          .then(() => {
            setInputText("");
            textareaRef.current.style.height = "auto";
            setTimeout(() => {
              if (!isAvatarSpeaking) isProcessingRef.current = false;
            }, 1000);
          })
          .catch((err) => {
            console.error("Voice send error:", err);
            isProcessingRef.current = false;
          });
      }

      recognitionRef.current = null;
      finalTranscriptRef.current = "";
    };

    recognition.onerror = (e) => {
      if (e.error !== "aborted" && e.error !== "no-speech") {
        alert(`Speech recognition error: ${e.error}`);
      }
      cleanupRecognition();
    };

    return recognition;
  };

  const handleMicDown = () => {
    if (isAvatarSpeaking || recording || isProcessingRef.current) return;

    const recognition = initRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (err) {
        console.error("Start error:", err);
        cleanupRecognition();
      }
    }
  };

  const handleMicUp = () => {
    if (recognitionRef.current && recording) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        cleanupRecognition();
      }
    }
  };

  const handleAskClick = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isAvatarSpeaking || isProcessingRef.current) return;

    isProcessingRef.current = true;
    try {
      await onSendMessage(trimmed, lang);
      setInputText("");
      textareaRef.current.style.height = "auto";
      setTimeout(() => {
        if (!isAvatarSpeaking) isProcessingRef.current = false;
      }, 1000);
    } catch (err) {
      console.error("Text message error:", err);
      isProcessingRef.current = false;
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAskClick();
    }
  };

  return (
    <>
      {/* Siri Listening Effect */}
      {recording && (
        <div className="siri-orb-container">
          <div className="siri-orb">
            <div className="siri-sphere">
              <div className="siri-flow siri-flow-1"></div>
              <div className="siri-flow siri-flow-2"></div>
              <div className="siri-flow siri-flow-3"></div>
              <div className="siri-flow siri-flow-4"></div>
              <div className="siri-glow"></div>
            </div>
          </div>
        </div>
      )}

      <div className="glass-container">
        <textarea
          ref={textareaRef}
          placeholder={lang === "hi" ? "अपना प्रश्न पूछें..." : "Ask your question..."}
          value={inputText}
          onChange={handleTextChange}
          onKeyPress={handleKeyPress}
          className={`glass-input ${recording ? "input-hidden" : ""}`}
          rows={1}
          disabled={isAvatarSpeaking || isProcessingRef.current}
        />

        {recording && (
          <div className="live-transcript">
            {liveTranscript || (lang === "hi" ? "🎙️ सुन रहा हूँ..." : "🎙️ Listening...")}
          </div>
        )}

        <div className="controls">
          <div className="lang-toggle" onClick={toggleLang}>
            <span className={`flag ${lang === "en" ? "flag-en" : "flag-hi"}`} title={lang === "en" ? "English" : "Hindi"}></span>
            <div className={`switch ${lang === "hi" ? "on" : ""}`}></div>
          </div>

          <button
            className={`mic ${recording ? "recording" : ""}`}
            onMouseDown={handleMicDown}
            onMouseUp={handleMicUp}
            onTouchStart={handleMicDown}
            onTouchEnd={handleMicUp}
            disabled={isAvatarSpeaking || isProcessingRef.current}
            title={lang === "hi" ? "बोलने के लिए दबाएं" : "Hold to speak"}
          >
            🎙️
          </button>

          <button
            className={`ask-btn ${recording ? "ask-hidden" : ""}`}
            onClick={handleAskClick}
            disabled={!inputText.trim() || isAvatarSpeaking || isProcessingRef.current}
          >
            {lang === "hi" ? "पूछें" : "Ask"}
          </button>
        </div>
      </div>
    </>
  );
};

export default GlassInput;