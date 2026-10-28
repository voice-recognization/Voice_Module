/**
 * VoiceProof Preset Audio & Voice Profile Samples
 * Provides sample voice recordings for instant testing (Authentic vs Synthetic Deepfake).
 */

export const PRESET_AUDIO_SAMPLES = [
  {
    id: "sample-authentic-1",
    title: "Press Conference Statement - CEO Earnings Release",
    speaker: "Dr. Elena Rostova",
    organization: "Global Quantum Dynamics",
    type: "Authentic Human Voice",
    isAuthentic: true,
    score: 98.4,
    scoreInt: 9840,
    audioUrl: null, // Generated synthetically via Web Audio API oscillator for standalone demo
    duration: 4.8,
    details: "Recorded with Neumann U87 Mic in studio environment. Micro-pitch tremors and natural room reverberation floor confirmed.",
    audioHash: "0xa1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef1",
    pHash: "0xf8a3b2c1d0e9f8a3b2c1d0e9f8a3b2c1d0e9f8a3b2c1d0e9f8a3b2c1d0e9f8a3",
    ipfsURI: "ipfs://QmX9z7a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1",
    registeredAt: 1726000000,
    creatorWallet: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
  },
  {
    id: "sample-deepfake-1",
    title: "Impersonation Attempt - Executive Wire Transfer Order",
    speaker: "Cloned Voice of CEO Elena Rostova",
    organization: "Unknown Attacker (ElevenLabs v2 Model)",
    type: "AI Synthetic Deepfake Detected",
    isAuthentic: false,
    score: 18.2,
    scoreInt: 1820,
    audioUrl: null,
    duration: 3.5,
    details: "Severe neural vocoder high-frequency aliasing detected >14kHz. Sterile silence floor & zero-pitch tremor trajectory.",
    audioHash: "0x99887766554433221100aabbccddeeff99887766554433221100aabbccddeeff",
    pHash: "0x11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
    ipfsURI: "ipfs://QmFakeVoiceDeepfakeAttackPayload0000000000000000000000",
    registeredAt: 1726500000,
    creatorWallet: "0x3D9832676f57825470C29A0d3464C936d0F94441"
  },
  {
    id: "sample-authentic-2",
    title: "Investigative Journalism Field Recording",
    speaker: "Marcus Vance",
    organization: "Bureau of Investigative Reporting",
    type: "Authentic Human Voice",
    isAuthentic: true,
    score: 93.8,
    scoreInt: 9380,
    audioUrl: null,
    duration: 6.2,
    details: "Field microphone audio with ambient background acoustic dynamics. Validated against registered Speaker Passport.",
    audioHash: "0x445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233",
    pHash: "0xccddeeff00112233445566778899aabbccddeeff00112233445566778899aabb",
    ipfsURI: "ipfs://QmInvestigativeReportVoiceProof2026Validated",
    registeredAt: 1726800000,
    creatorWallet: "0x1234567890abcdef1234567890abcdef12345678"
  }
];

export const INITIAL_SPEAKER_PROFILES = [
  {
    wallet: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    name: "Dr. Elena Rostova",
    organization: "Global Quantum Dynamics",
    voiceEmbeddingHash: "0xe1e2e3e4e5e6e7e8e9e0f1f2f3f4f5f6f7f8f9f0a1a2a3a4a5a6a7a8a9a0b1b2",
    registeredAt: "2026-08-15",
    isVerified: true,
    totalAudioMinted: 14
  },
  {
    wallet: "0x1234567890abcdef1234567890abcdef12345678",
    name: "Marcus Vance",
    organization: "Bureau of Investigative Reporting",
    voiceEmbeddingHash: "0x33334444555566667777888899990000aaaabbbbccccddddeeeeffff11112222",
    registeredAt: "2026-09-01",
    isVerified: true,
    totalAudioMinted: 8
  },
  {
    wallet: "0x9876543210fedcba9876543210fedcba98765432",
    name: "Sarah Chen, Esq.",
    organization: "Veritas Legal Integrity Group",
    voiceEmbeddingHash: "0x9999888877776666555544443333222211110000ffffe2e2e2e2e2e2e2e2e2e2",
    registeredAt: "2026-09-10",
    isVerified: true,
    totalAudioMinted: 5
  }
];

/**
 * Generates an AudioBuffer in memory for testing synthesizer playback
 */
export function generateSyntheticDemoAudioBuffer(isAuthentic = true) {
  const sampleRate = 44100;
  const duration = 3.0; // 3 seconds
  const frameCount = sampleRate * duration;
  
  let myArrayBuffer;
  if (typeof window !== 'undefined') {
    const OfflineCtxClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (OfflineCtxClass) {
      try {
        const offlineCtx = new OfflineCtxClass(1, frameCount, sampleRate);
        myArrayBuffer = offlineCtx.createBuffer(1, frameCount, sampleRate);
      } catch {}
    }
  }

  if (!myArrayBuffer && typeof window !== 'undefined') {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if (AudioCtxClass) {
      const audioCtx = new AudioCtxClass();
      myArrayBuffer = audioCtx.createBuffer(1, frameCount, sampleRate);
      audioCtx.close().catch(() => {});
    }
  }

  if (!myArrayBuffer) return null;
  const channelData = myArrayBuffer.getChannelData(0);

  for (let i = 0; i < frameCount; i++) {
    const t = i / sampleRate;
    // Fundamental voice pitch ~130Hz
    let sample = Math.sin(2 * Math.PI * 130 * t) * 0.4;
    sample += Math.sin(2 * Math.PI * 260 * t) * 0.2; // 2nd Harmonic
    sample += Math.sin(2 * Math.PI * 390 * t) * 0.1; // 3rd Harmonic

    if (isAuthentic) {
      // Natural pitch micro-vibrato (jitter)
      const jitter = Math.sin(2 * Math.PI * 5 * t) * 6;
      sample += Math.sin(2 * Math.PI * (130 + jitter) * t) * 0.15;
      // Micro room noise floor
      sample += (Math.random() - 0.5) * 0.005;
    } else {
      // AI TTS robotic flat pitch with metallic vocoder artifact above 12kHz
      sample += Math.sin(2 * Math.PI * 14500 * t) * 0.08;
    }
    
    // Envelope fade in / out
    if (t < 0.2) sample *= (t / 0.2);
    if (t > 2.8) sample *= ((3.0 - t) / 0.2);

    channelData[i] = sample;
  }

  return myArrayBuffer;
}
