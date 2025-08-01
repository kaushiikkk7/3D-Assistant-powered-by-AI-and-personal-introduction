// utils/elevenLabsAPI.js

const ELEVENLABS_API_KEY = 'sk_f7bcbe38566614847d743f63d7e47a751530741efabe38b3'; // Replace with your actual API key
const VOICE_IDS = {
  en: 'ZJCNdZEjYwkOElxugmW2', // English male
  hi: 'ZJCNdZEjYwkOElxugmW2'  // Hindi male
};

const speakWithWebAPI = (text, language = 'en') => {
  return new Promise((resolve) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 5;
    const voices = speechSynthesis.getVoices();

    if (language === 'hi') {
      utterance.lang = 'hi-IN';
      const voice = voices.find(v => v.lang.includes('hi') && v.name.toLowerCase().includes('male'));
      if (voice) utterance.voice = voice;
    } else {
      utterance.lang = 'en-US';
      const voice = voices.find(v => v.lang.includes('en') && v.name.toLowerCase().includes('male'));
      if (voice) utterance.voice = voice;
    }

    const words = text.split(' ');
    const visemes = words.map(word => ({
      viseme: getVisemeForWord(word, language),
      duration: word.length * 0.1 + 0.2
    }));

    resolve({ audioUrl: null, visemes, audio: utterance });
  });
};

export const getElevenLabsAudio = async (text, language = 'en') => {
  const voiceId = VOICE_IDS[language] || VOICE_IDS.en;

  if (!ELEVENLABS_API_KEY) {
    return await speakWithWebAPI(text, language);
  }

  try {
    const modelId = language === 'hi' ? 'eleven_multilingual_v2' : 'eleven_monolingual_v1';

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: language === 'hi' ? 0.3 : 0.0,
          use_speaker_boost: true
        },
      }),
    });

    if (!response.ok) throw new Error(await response.text());

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);

    const visemes = text.split(' ').map(word => ({
      viseme: getVisemeForWord(word, language),
      duration: word.length * 0.1 + 0.3
    }));

    return { audioUrl, visemes, audio: null };

  } catch (err) {
    console.error('ElevenLabs failed:', err);
    return await speakWithWebAPI(text, language);
  }
};

const getVisemeForWord = (word, language = 'en') => {
  const vowelMap = {
    a: 'aa', e: 'E', i: 'ih', o: 'oh', u: 'ou',
    अ: 'aa', आ: 'aa', इ: 'ih', ई: 'ih', उ: 'ou', ऊ: 'ou',
    ए: 'E', ऐ: 'E', ओ: 'oh', औ: 'oh'
  };

  const consonantMap = {
    b: 'PP', p: 'PP', m: 'PP', f: 'FF', v: 'FF', th: 'TH', d: 'DD', t: 'DD', n: 'DD', 
    k: 'kk', g: 'kk', s: 'SS', z: 'SS', r: 'RR',
    क: 'kk', ख: 'kk', ग: 'kk', घ: 'kk',
    च: 'CH', छ: 'CH', ज: 'CH', झ: 'CH',
    ट: 'DD', ठ: 'DD', ड: 'DD', ढ: 'DD', ण: 'nn',
    त: 'DD', थ: 'TH', द: 'DD', ध: 'DD', न: 'nn',
    प: 'PP', फ: 'FF', ब: 'PP', भ: 'PP', म: 'PP',
    य: 'ih', र: 'RR', ल: 'RR', व: 'FF',
    श: 'SS', ष: 'SS', स: 'SS', ह: 'aa'
  };

  const firstChar = word[0];
  const vowel = word.toLowerCase().match(/[aeiouअआइईउऊएऐओऔ]/)?.[0];
  if (vowel && vowelMap[vowel]) return vowelMap[vowel];
  return consonantMap[firstChar] || consonantMap[firstChar.toLowerCase()] || 'aa';
};
