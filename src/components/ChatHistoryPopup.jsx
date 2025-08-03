import React, { useState, useRef, useEffect } from 'react';
import { X, Download, MessageCircle, User, Bot } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import "./GlassInput.css";

const ChatHistoryPopup = ({
  isOpen,
  onClose,
  chatHistory = [],
  currentLanguage = "en"
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const popupRef = useRef(null); // 🔁 Renamed for clarity

  useEffect(() => {
    if (popupRef.current) {
      const chatMessagesEl = popupRef.current.querySelector('.chat-messages');
      if (chatMessagesEl) {
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
      }
    }
  }, [chatHistory]);

  const generatePDF = async () => {
    if (!popupRef.current) return;
    setIsDownloading(true);

    try {
      const canvas = await html2canvas(popupRef.current, {
        backgroundColor: "#ffffff", // solid white background
        scale: 2,
        useCORS: true
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`kaushik-assistant-chat-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  const getText = (key, defaultText) => {
    const texts = {
      en: {
        title: "Chat History",
        empty: "No conversation yet. Start chatting with Kaushik's assistant!",
        download: "Download Chat",
        downloading: "Downloading...",
        user: "You",
        assistant: "Kaushik's Assistant"
      },
      hi: {
        title: "चैट इतिहास",
        empty: "अभी तक कोई बातचीत नहीं। कौशिक के असिस्टेंट से चैट शुरू करें!",
        download: "चैट डाउनलोड करें",
        downloading: "डाउनलोड हो रहा है...",
        user: "आप",
        assistant: "कौशिक का असिस्टेंट"
      }
    };
    return texts[currentLanguage]?.[key] || texts.en[key] || defaultText;
  };

  return (
    <>
      <div className="chat-popup-backdrop" onClick={onClose} />

      <div ref={popupRef} className="glass-chat-popup">
        {/* Header */}
        <div className="chat-popup-header">
          <div className="chat-popup-title">
            <MessageCircle className="w-5 h-5 text-blue-400" />
            <h3>{getText('title', 'Chat History')}</h3>
          </div>
          <div className="chat-popup-controls">
            <button
              onClick={generatePDF}
              disabled={isDownloading || chatHistory.length === 0}
              className="download-btn"
              title={getText('download', 'Download Chat')}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">
                {isDownloading
                  ? getText('downloading', 'Downloading...')
                  : getText('download', 'Download')}
              </span>
            </button>
            <button
              onClick={onClose}
              className="close-btn"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="chat-messages">
          {chatHistory.length === 0 ? (
            <div className="chat-empty-state">
              <MessageCircle className="chat-empty-icon" />
              <p className="chat-empty-text">
                {getText('empty', "No conversation yet. Start chatting with Kaushik's assistant!")}
              </p>
            </div>
          ) : (
            <div className="chat-messages-list">
              {chatHistory.map((message, index) => (
                <div
                  key={index}
                  className={`message ${message.type === 'user' ? 'user-message' : 'assistant-message'}`}
                >
                  <div className="message-header">
                    <div className="message-avatar">
                      {message.type === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    <div className="message-info">
                      <span className="message-sender">
                        {message.type === 'user'
                          ? getText('user', 'You')
                          : getText('assistant', "Kaushik's Assistant")}
                      </span>
                      <span className="message-time">
                        {new Date(message.timestamp || Date.now()).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <div className="message-content">{message.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatHistoryPopup;

