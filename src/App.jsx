// src/App.jsx
import { useState, useRef } from "react";
import GlassInput from "./components/GlassInput";
import { Experience } from "./components/Experience";
import ChatHistoryPopup from "./components/ChatHistoryPopup";
import { getGeminiAnswer } from "./utils/geminiAPI";
import { getElevenLabsAudio } from "./utils/elevenLabsAPI";
import {
  playVisemesWithWeights,
  playTextBasedLipSync,
} from "./components/VisemePlayer";
import { Leva } from "leva";

function App() {
  const [isListening, setIsListening] = useState(false);
  const [showResumePopup, setShowResumePopup] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [animation, setAnimation] = useState("idle");
  const [currentViseme, setCurrentViseme] = useState(null);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [showEmail, setShowEmail] = useState(false);
  
  // Chat History States
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  const currentAudioRef = useRef(null);
  const cleanupVisemeRef = useRef(null);
  const animationStartedRef = useRef(false);

  // Add message to chat history
  const addToHistory = (text, type, timestamp = Date.now()) => {
    setChatHistory(prev => [...prev, { text, type, timestamp }]);
  };

  const speak = async (text, language = "en") => {
    try {
      if (cleanupVisemeRef.current) {
        cleanupVisemeRef.current();
        cleanupVisemeRef.current = null;
      }

      animationStartedRef.current = false;
      setAnimation("talking");
      setIsAvatarSpeaking(true);
      setCurrentViseme(null);

      // Add assistant message to history
      addToHistory(text, 'assistant');

      const { audioUrl, visemes, audio } = await getElevenLabsAudio(text, language);

      if (audioUrl) {
        const audioElement = new Audio(audioUrl);
        currentAudioRef.current = audioElement;

        audioElement.onended = () => {
          setAnimation("idle");
          setIsAvatarSpeaking(false);
          setCurrentViseme(null);
          currentAudioRef.current = null;
          animationStartedRef.current = false;
          URL.revokeObjectURL(audioUrl);
          if (cleanupVisemeRef.current) cleanupVisemeRef.current();
        };

        audioElement.onerror = (error) => {
          console.error("Audio error:", error);
          setAnimation("idle");
          setIsAvatarSpeaking(false);
          setCurrentViseme(null);
          currentAudioRef.current = null;
          animationStartedRef.current = false;
          if (cleanupVisemeRef.current) cleanupVisemeRef.current();
        };

        audioElement.ontimeupdate = () => {
          if (!animationStartedRef.current && audioElement.currentTime > 0) {
            animationStartedRef.current = true;

            if (visemes?.length) {
              cleanupVisemeRef.current = playVisemesWithWeights(
                setCurrentViseme,
                visemes,
                () => setCurrentViseme(null)
              );
            } else {
              const estimatedDuration = audioElement.duration * 1000 || 3000;
              cleanupVisemeRef.current = playTextBasedLipSync(
                setCurrentViseme,
                text,
                estimatedDuration,
                () => setCurrentViseme(null)
              );
            }
          }
        };

        await audioElement.play();
      } else if (audio) {
        currentAudioRef.current = { cancel: () => speechSynthesis.cancel() };

        audio.onend = () => {
          setAnimation("idle");
          setIsAvatarSpeaking(false);
          setCurrentViseme(null);
          currentAudioRef.current = null;
          animationStartedRef.current = false;
          if (cleanupVisemeRef.current) cleanupVisemeRef.current();
        };

        audio.onstart = () => {
          animationStartedRef.current = true;
          const estimatedDuration = Math.max(2000, (text.split(" ").length / 150) * 60000);
          cleanupVisemeRef.current = playTextBasedLipSync(
            setCurrentViseme,
            text,
            estimatedDuration,
            () => setCurrentViseme(null)
          );
        };

        speechSynthesis.speak(audio);
      }
    } catch (error) {
      console.error("speak() error:", error);
      setAnimation("idle");
      setIsAvatarSpeaking(false);
      setCurrentViseme(null);
      currentAudioRef.current = null;
      animationStartedRef.current = false;
      if (cleanupVisemeRef.current) cleanupVisemeRef.current();
    }
  };

  const handleSendMessage = async (inputText, language = currentLanguage) => {
    try {
      // Add user message to history
      addToHistory(inputText, 'user');

      if (currentAudioRef.current) {
        if (currentAudioRef.current.pause) {
          currentAudioRef.current.pause();
          currentAudioRef.current.currentTime = 0;
        } else if (currentAudioRef.current.cancel) {
          currentAudioRef.current.cancel();
        }
        speechSynthesis.cancel();
        currentAudioRef.current = null;
      }

      if (cleanupVisemeRef.current) {
        cleanupVisemeRef.current();
        cleanupVisemeRef.current = null;
      }

      animationStartedRef.current = false;
      setAnimation("thinking");
      setIsAvatarSpeaking(false);
      setCurrentViseme(null);

      await new Promise((res) => setTimeout(res, 50));

      const response = await getGeminiAnswer(inputText, language);
      await new Promise((res) => setTimeout(res, 100));
      await speak(response, language);
    } catch (error) {
      console.error("handleSendMessage error:", error);
      const fallback = language === "hi" ? "माफ़ करें, मैं उसे प्रोसेस नहीं कर सका।" : "Sorry, I couldn't process that.";
      await speak(fallback, language);
    }
  };

  const handleLanguageChange = (newLang) => {
    setCurrentLanguage(newLang);
  };

  return (
    <>
      <Experience
        isListening={isListening}
        transcript={transcript}
        currentAnimation={animation}
        visemeWeights={currentViseme}
        isAvatarSpeaking={isAvatarSpeaking}
      />
      
      <GlassInput
        setIsListening={setIsListening}
        setTranscript={setTranscript}
        setAnimation={setAnimation}
        onSendMessage={handleSendMessage}
        onLanguageChange={handleLanguageChange}
        isAvatarSpeaking={isAvatarSpeaking}
        currentLanguage={currentLanguage}
      />

      {/* Chat History Toggle Button */}
      <button
        onClick={() => setShowChatHistory(!showChatHistory)}
        className="chat-history-toggle"
        title={currentLanguage === "hi" ? "चैट इतिहास देखें" : "View Chat History"}
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
          />
        </svg>
        {chatHistory.length > 0 && (
          <span className="chat-count">{chatHistory.length}</span>
        )}
      </button>

      {/* Chat History Popup */}
      <ChatHistoryPopup
        isOpen={showChatHistory}
        onClose={() => setShowChatHistory(false)}
        chatHistory={chatHistory}
        currentLanguage={currentLanguage}
      />
      
      <Leva hidden />
    </>
  );
}

export default App;