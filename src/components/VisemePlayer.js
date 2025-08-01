// components/VisemePlayer.js

export const VISEME_MAPPINGS = {
  sil: { jawOpen: 1, mouthOpen: 2, mouthSmileLeft: 0, mouthSmileRight: 0, mouthFrownLeft: 0, mouthFrownRight: 0, mouthPucker: 0, mouthLeft: 0, mouthRight: 0 },

  PP: { jawOpen: 0.05, mouthOpen: 0.05, mouthPucker: 0.8 },
  FF: { jawOpen: 0.1, mouthOpen: 0.1, mouthFrownLeft: 0.3, mouthFrownRight: 0.3 },
  TH: { jawOpen: 0.2, mouthOpen: 0.2 },
  DD: { jawOpen: 0.3, mouthOpen: 0.3 },
  kk: { jawOpen: 0.4, mouthOpen: 0.4 },
  CH: { jawOpen: 0.2, mouthOpen: 0.2, mouthSmileLeft: 0.3, mouthSmileRight: 0.3 },
  SS: { jawOpen: 0.1, mouthOpen: 0.1, mouthSmileLeft: 0.5, mouthSmileRight: 0.5 },
  nn: { jawOpen: 0.2, mouthOpen: 0.2 },
  RR: { jawOpen: 0.3, mouthOpen: 0.3, mouthPucker: 0.2 },

  aa: { jawOpen: 0.4, mouthOpen: 0.4 },
  E:  { jawOpen: 0.2, mouthOpen: 0.2, mouthSmileLeft: 0.2, mouthSmileRight: 0.2 },
  ih: { jawOpen: 0.15, mouthOpen: 0.15, mouthSmileLeft: 0.15, mouthSmileRight: 0.15 },
  oh: { jawOpen: 0.3, mouthOpen: 0.3, mouthPucker: 0.3 },
  ou: { jawOpen: 0.2, mouthOpen: 0.2, mouthPucker: 0.5 }
};

// Convert viseme weights to morph target updates
export const convertVisemeWeightsToMorphTargets = (visemeWeights) =>
  Object.entries(visemeWeights)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));

// Viseme animation playback with timing and cleanup
export const playVisemesWithWeights = (setCurrentViseme, visemes, onComplete) => {
  if (!Array.isArray(visemes) || visemes.length === 0) {
    onComplete?.();
    return () => {};
  }

  let index = 0;
  let timeoutId;

  const playNext = () => {
    if (index >= visemes.length) {
      setCurrentViseme(null);
      onComplete?.();
      return;
    }

    const { viseme = 'sil', duration = 0.15 } = visemes[index];
    const morphData = VISEME_MAPPINGS[viseme] || VISEME_MAPPINGS.sil;

    const strongest = Object.entries(morphData)
      .filter(([_, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])[0];

    if (strongest) {
      setCurrentViseme({ name: strongest[0], value: strongest[1] });
    } else {
      setCurrentViseme(null);
    }

    index++;
    timeoutId = setTimeout(playNext, duration * 1000);
  };

  playNext();

  return () => {
    clearTimeout(timeoutId);
    setCurrentViseme(null);
  };
};

// Fallback animation using only text and timing
export const playTextBasedLipSync = (setCurrentViseme, text, duration = 2000, onComplete) => {
  if (!text?.trim()) {
    onComplete?.();
    return () => {};
  }

  const words = text.trim().split(/\s+/);
  const interval = duration / words.length;
  let index = 0;
  let intervalId;

  const phonemeMap = {
    a: 'aa', e: 'E', i: 'ih', o: 'oh', u: 'ou',
    b: 'PP', p: 'PP', m: 'PP',
    f: 'FF', v: 'FF',
    t: 'DD', d: 'DD', n: 'nn',
    k: 'kk', g: 'kk',
    s: 'SS', z: 'SS',
    r: 'RR'
  };

  const next = () => {
    if (index >= words.length) {
      clearInterval(intervalId);
      setCurrentViseme(null);
      onComplete?.();
      return;
    }

    const firstChar = words[index][0]?.toLowerCase() || '';
    const visemeKey = phonemeMap[firstChar] || 'aa';
    const morphs = VISEME_MAPPINGS[visemeKey] || VISEME_MAPPINGS.aa;

    const strongest = Object.entries(morphs)
      .filter(([_, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])[0];

    if (strongest) {
      const jitter = Math.max(0.1, strongest[1] + (Math.random() - 0.5) * 0.2);
      setCurrentViseme({ name: strongest[0], value: Math.min(1, jitter) });
    }

    index++;
  };

  intervalId = setInterval(next, interval);
  next();

  return () => {
    clearInterval(intervalId);
    setCurrentViseme(null);
  };
};

// Manual test mode with sample visemes
export const testVisemes = (setCurrentViseme) => {
  const sequence = [
    { viseme: 'sil', duration: 0.4 },
    { viseme: 'aa',  duration: 0.4 },
    { viseme: 'E',   duration: 0.4 },
    { viseme: 'ih',  duration: 0.4 },
    { viseme: 'oh',  duration: 0.4 },
    { viseme: 'ou',  duration: 0.4 },
    { viseme: 'PP',  duration: 0.4 },
    { viseme: 'SS',  duration: 0.4 },
    { viseme: 'sil', duration: 0.4 }
  ];

  return playVisemesWithWeights(setCurrentViseme, sequence, () =>
    console.log('Viseme test sequence complete.')
  );
};
