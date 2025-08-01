// utils/geminiAPI.js
import { personalData } from './personalData';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const checkPresetData = (question, language = 'en') => {
  const lowerQuestion = question.toLowerCase();
  for (const item of personalData) {
    const keywords = item.keywords || [];
    const hasKeyword = keywords.some(keyword =>
      lowerQuestion.includes(keyword.toLowerCase())
    );
    if (hasKeyword || lowerQuestion.includes(item.question.toLowerCase())) {
      // Return language-specific answer if available
      if (language === 'hi' && item.answerHi) {
        return item.answerHi;
      } else if (language === 'hi' && item.answer_hi) {
        return item.answer_hi;
      } else if (language === 'en' && item.answerEn) {
        return item.answerEn;
      } else if (language === 'en' && item.answer_en) {
        return item.answer_en;
      }
      // Fallback to default answer
      return item.answer;
    }
  }
  return null;
};

const getGeminiResponse = async (question, language = 'en') => {
  // Check if API key is available
  if (!GEMINI_API_KEY) {
    console.error('Gemini API key is not configured');
    const errorMsg = language === 'hi' 
      ? "मुझे खुशी होगी आपकी मदद करने में, लेकिन मुझे अपने knowledge base से connect करने के लिए API key की जरूरत है।"
      : "I'm sorry, I need an API key to connect to my knowledge base. Please check your configuration.";
    return errorMsg;
  }

  try {
    console.log('Making request to Gemini Pro API for language:', language);
    
    // Create language-specific prompt with more explicit instructions
    const languageInstruction = language === 'hi' 
      ? "आप कौशिक हैं, एक helpful AI assistant। हमेशा हिंदी में respond करें। responses को conversational और text-to-speech के लिए suitable रखें। friendly और personal तरीके से जवाब दें। कम से कम एक sentence में जरूर जवाब दें।"
      : "You are Kaushik, a helpful AI assistant. Always respond in English. Keep responses concise and conversational, suitable for text-to-speech. Respond in a friendly, personal way. Always provide at least one sentence as a response.";
    
    // Enhanced request body with better configuration
    const requestBody = {
      contents: [{
        parts: [{
          text: `${languageInstruction}\n\nUser question: "${question}"\n\nPlease provide a helpful response:`
        }]
      }],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 300,
        stopSequences: [],
        candidateCount: 1
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    // Updated to use Gemini Pro model
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);
    
    // Check if the response is ok
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini Pro API Error Response:', errorText);
      
      // Try to parse error for more details
      try {
        const errorData = JSON.parse(errorText);
        console.error('Parsed error data:', errorData);
      } catch (e) {
        console.error('Could not parse error response as JSON');
      }
      
      if (response.status === 401 || response.status === 403) {
        return language === 'hi' 
          ? "मुझे खुशी होगी आपकी मदद करने में, लेकिन मेरी API key के साथ authentication issue है।"
          : "I'm sorry, there's an authentication issue with my API key. Please check the configuration.";
      } else if (response.status === 429) {
        return language === 'hi' 
          ? "माफ़ करें, मुझे अभी बहुत सारे requests मिल रहे हैं। कृपया थोड़ी देर बाद try करें।"
          : "I'm sorry, I'm receiving too many requests right now. Please try again in a moment.";
      } else if (response.status >= 500) {
        return language === 'hi' 
          ? "माफ़ करें, Gemini service में कुछ issues हैं। कृपया बाद में try करें।"
          : "I'm sorry, the Gemini service seems to be experiencing issues. Please try again later.";
      } else {
        return language === 'hi' 
          ? `माफ़ करें, मुझे एक error आई है (${response.status})। कृपया फिर से try करें।`
          : `I'm sorry, I encountered an error (${response.status}). Please try again.`;
      }
    }

    const data = await response.json();
    console.log('Gemini Pro API Response:', JSON.stringify(data, null, 2));

    // Enhanced response validation
    if (!data) {
      throw new Error('No data received from Gemini Pro API');
    }

    // Check for blocked content or other issues
    if (data.promptFeedback?.blockReason) {
      console.error('Content was blocked:', data.promptFeedback);
      return language === 'hi' 
        ? "माफ़ करें, मैं इस question का जवाब नहीं दे सकता। कृपया कोई और question पूछें।"
        : "I'm sorry, I cannot answer this question. Please try asking something else.";
    }

    if (!data.candidates) {
      console.error('No candidates in response:', data);
      return language === 'hi' 
        ? "माफ़ करें, मुझे proper response generate करने में trouble हो रही है। कृपया फिर से try करें।"
        : "I'm sorry, I'm having trouble generating a proper response. Please try again.";
    }

    if (!Array.isArray(data.candidates) || data.candidates.length === 0) {
      console.error('Empty or invalid candidates array:', data.candidates);
      return language === 'hi' 
        ? "माफ़ करें, मुझे valid response नहीं मिली। कृपया अपना question rephrase करें।"
        : "I'm sorry, I didn't receive a valid response. Could you please rephrase your question?";
    }

    const candidate = data.candidates[0];
    
    // Check if candidate was blocked or finished for safety reasons
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      console.error('Response finished with reason:', candidate.finishReason);
      if (candidate.finishReason === 'SAFETY') {
        return language === 'hi' 
          ? "माफ़ करें, मैं safety reasons की वजह से इस question का जवाब नहीं दे सकता।"
          : "I'm sorry, I cannot answer this question for safety reasons.";
      } else if (candidate.finishReason === 'MAX_TOKENS') {
        return language === 'hi' 
          ? "माफ़ करें, मेरा response बहुत लंबा हो गया। कृपया specific question पूछें।"
          : "I'm sorry, my response got too long. Please ask a more specific question.";
      }
    }

    if (!candidate.content) {
      console.error('No content in candidate:', candidate);
      return language === 'hi' 
        ? "माफ़ करें, मुझे content generate करने में problem आई है। कृपया फिर से try करें।"
        : "I'm sorry, I had trouble generating content. Please try again.";
    }

    if (!candidate.content.parts || !Array.isArray(candidate.content.parts)) {
      console.error('No parts in content:', candidate.content);
      return language === 'hi' 
        ? "माफ़ करें, response structure में problem है। कृपया फिर से try करें।"
        : "I'm sorry, there's an issue with the response structure. Please try again.";
    }

    if (!candidate.content.parts[0]) {
      console.error('No first part in content:', candidate.content.parts);
      return language === 'hi' 
        ? "माफ़ করें, response का पहला part missing है। कृपया फिर से try करें।"
        : "I'm sorry, the first part of the response is missing. Please try again.";
    }

    // Handle empty text more gracefully
    const textContent = candidate.content.parts[0].text;
    if (!textContent || textContent.trim() === '') {
      console.error('Empty text in response part:', candidate.content.parts[0]);
      console.log('Full candidate object:', JSON.stringify(candidate, null, 2));
      
      // Return a fallback response instead of throwing an error
      return language === 'hi' 
        ? "मुझे खुशी होगी आपकी मदद करने में! कृपया अपना question थोड़ा और specific बनाएं।"
        : "I'd be happy to help you! Could you please make your question a bit more specific?";
    }

    const content = textContent.trim();
    console.log('Final content:', content);
    
    return content;

  } catch (error) {
    console.error('Gemini Pro API Error Details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Handle different types of errors with language-specific messages
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return language === 'hi' 
        ? "माफ़ करें, मुझे internet से connect करने में trouble हो रही है। कृपया अपना connection check करें।"
        : "I'm sorry, I'm having trouble connecting to the internet. Please check your connection and try again.";
    } else if (error.name === 'SyntaxError') {
      return language === 'hi' 
        ? "माफ़ करें, मुझे invalid response मिली है। कृपया फिर से try करें।"
        : "I'm sorry, I received an invalid response. Please try again.";
    } else if (error.message.includes('Invalid response structure')) {
      return language === 'hi' 
        ? "माफ़ करें, मुझे unexpected response format मिली है। कृपया फिर से try करें।"
        : "I'm sorry, I received an unexpected response format. Please try again.";
    } else {
      return language === 'hi' 
        ? "माफ़ करें, मुझे अपने knowledge base से connect करने में trouble हो रही है। कृपया थोड़ी देर बाद try करें।"
        : "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again in a moment.";
    }
  }
};

export const getGeminiAnswer = async (question, language = 'en') => {
  try {
    // Validate input
    if (!question || question.trim() === '') {
      return language === 'hi' 
        ? "कृपया कोई question पूछें।"
        : "Please ask me a question.";
    }

    // Always check preset data first with language support
    const presetAnswer = checkPresetData(question, language);
    if (presetAnswer) {
      console.log('Using preset answer for:', question, 'in language:', language);
      return presetAnswer;
    }

    console.log('Using Gemini Pro for:', question, 'in language:', language);
    return await getGeminiResponse(question, language);
    
  } catch (error) {
    console.error('Error in getGeminiAnswer:', error);
    return language === 'hi' 
      ? "माफ़ करें, आपके question को process करते समय कुछ गलत हुआ है। कृपया फिर से try करें।"
      : "I'm sorry, something went wrong while processing your question. Please try again.";
  }
};