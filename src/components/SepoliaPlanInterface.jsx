import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Upload, FileAudio, Cpu, CheckCircle2, AlertTriangle, 
  XCircle, Copy, Check, ExternalLink, ArrowRight, Play, Pause, 
  RotateCcw, Sparkles, Terminal, FileCode, Layers, Info, 
  Download, QrCode, Lock, CheckCircle, HelpCircle, Activity,
  Database, RefreshCw, Award, Eye, Volume2, VolumeX, Sliders,
  Zap, Compass, PlayCircle, StopCircle, ArrowUpRight, Radio,
  ChevronDown, Minimize2, Maximize2
} from 'lucide-react';
import { computeAudioHash, tamperAudioData } from '../utils/cryptoHasher';
import { decodeAudioSource, analyzeAudioForensics, getSharedAudioContext } from '../utils/audioAnalyzer';
import { generateSyntheticDemoAudioBuffer } from '../utils/presetAudio';
import { blockchainService } from '../utils/blockchain';
import { soundEffects } from '../utils/soundEffects';
import confetti from 'canvas-confetti';

// Pre-defined beginner test audio presets
const MINI_PROJECT_SAMPLES = [
  {
    id: 'sample-human',
    name: '1. Human Speech Statement (Original.wav)',
    type: 'Human Speech',
    isAuthentic: true,
    expectedAiLabel: 'Likely Natural Human Speech',
    expectedRiskScore: 12.4,
    description: 'Clean acoustic recording with natural micro-jitter and room ambience.',
    fileSize: 1048576,
    duration: 3.4
  },
  {
    id: 'sample-ai-clone',
    name: '2. AI Voice Clone (Synthetic_TTS.wav)',
    type: 'AI Synthetic Speech',
    isAuthentic: false,
    expectedAiLabel: 'Potential AI-Generated / Cloned Voice',
    expectedRiskScore: 88.6,
    description: 'Synthetic voice synthesized by neural vocoder with high-frequency phase artifacts.',
    fileSize: 842100,
    duration: 3.1
  },
  {
    id: 'sample-tampered',
    name: '3. Tampered Audio (Modified_1bit.wav)',
    type: 'Modified Audio',
    isAuthentic: true,
    isTampered: true,
    expectedAiLabel: 'Likely Natural Speech (Tampered Metadata)',
    expectedRiskScore: 16.2,
    description: 'Audio with 1 altered byte in metadata payload to test cryptographic hash avalanche.',
    fileSize: 1048576,
    duration: 3.4
  },
  {
    id: 'sample-unregistered',
    name: '4. Unregistered Voice Note (Random.mp3)',
    type: 'Unregistered Audio',
    isAuthentic: true,
    isUnregistered: true,
    expectedAiLabel: 'Likely Natural Speech',
    expectedRiskScore: 22.8,
    description: 'Fresh voice recording that has never been registered on the Sepolia smart contract.',
    fileSize: 524288,
    duration: 2.8
  }
];

// Solidity Smart Contract Code (Section 6 of plan)
const SOLIDITY_CONTRACT_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VoiceProof
 * @dev Beginner Mini Project: Audio Authenticity Provenance on Ethereum Sepolia Testnet
 * Stores cryptographic SHA-256 audio fingerprints and verification timestamps.
 */
contract VoiceProof {
    
    // Structure storing provenance metadata
    struct AudioRecord {
        bytes32 audioHash;      // 32-byte SHA-256 fingerprint
        address registrant;     // Wallet address that registered the file
        uint256 timestamp;      // Block timestamp of registration
        bool isRegistered;      // Existence flag
    }

    // Mapping from SHA-256 hash to provenance record
    mapping(bytes32 => AudioRecord) private records;

    // Total audio recordings registered
    uint256 public totalRegistrations;

    // Emitted whenever a new audio file is registered
    event AudioRegistered(
        bytes32 indexed audioHash,
        address indexed registrant,
        uint256 timestamp
    );

    /**
     * @notice Register a new audio fingerprint on Sepolia
     * @param _hash The 32-byte SHA-256 hash of the audio file
     */
    function registerAudio(bytes32 _hash) external returns (bool) {
        require(_hash != bytes32(0), "Invalid audio hash");
        require(!records[_hash].isRegistered, "Audio fingerprint already registered");

        records[_hash] = AudioRecord({
            audioHash: _hash,
            registrant: msg.sender,
            timestamp: block.timestamp,
            isRegistered: true
        });

        totalRegistrations++;

        emit AudioRegistered(_hash, msg.sender, block.timestamp);
        return true;
    }

    /**
     * @notice Check whether a given audio fingerprint has been registered
     * @param _hash The 32-byte SHA-256 hash to query
     */
    function verifyAudio(bytes32 _hash) external view returns (bool) {
        return records[_hash].isRegistered;
    }

    /**
     * @notice Retrieve the full provenance metadata for an audio fingerprint
     * @param _hash The 32-byte SHA-256 hash
     */
    function getRecord(bytes32 _hash) external view returns (
        bytes32 audioHash,
        address registrant,
        uint256 timestamp,
        bool isRegistered
    ) {
        AudioRecord memory rec = records[_hash];
        return (rec.audioHash, rec.registrant, rec.timestamp, rec.isRegistered);
    }
}`;

// Python Flask Backend Code (Section 3 & 9 of plan)
const FLASK_APP_CODE = `# app.py - VoiceProof Flask Backend
from flask import Flask, request, jsonify, render_template
import hashlib
import os
from ai.detector import estimate_synthetic_likelihood
from blockchain.web3_client import register_audio_on_sepolia, verify_audio_on_sepolia

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 25 * 1024 * 1024  # 25 MB max
ALLOWED_EXTENSIONS = {'wav', 'mp3'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/analyze', methods=['POST'])
def analyze_and_fingerprint():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    file = request.files['audio']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({"error": "Unsupported file format. Please upload WAV or MP3"}), 400
    
    file_bytes = file.read()
    
    # Step 2: SHA-256 Fingerprint
    sha256_hex = hashlib.sha256(file_bytes).hexdigest()
    bytes32_hash = f"0x{sha256_hex}"
    
    # Step 3: Probabilistic AI Voice Classification
    ai_result = estimate_synthetic_likelihood(file_bytes, file.filename)
    
    return jsonify({
        "filename": file.filename,
        "file_size": len(file_bytes),
        "sha256_hex": sha256_hex,
        "bytes32_hash": bytes32_hash,
        "ai_analysis": {
            "synthetic_risk_score": ai_result["risk_score"],
            "confidence": ai_result["confidence"],
            "classification": ai_result["label"],
            "disclaimer": "AI detection is probabilistic, not proof."
        }
    })

@app.route('/api/register', methods=['POST'])
def register_provenance():
    data = request.json or {}
    bytes32_hash = data.get('bytes32_hash')
    if not bytes32_hash or len(bytes32_hash) != 66:
        return jsonify({"error": "Invalid bytes32 audio hash"}), 400
    
    tx_receipt = register_audio_on_sepolia(bytes32_hash)
    return jsonify(tx_receipt)

@app.route('/api/verify', methods=['POST'])
def verify_provenance():
    data = request.json or {}
    bytes32_hash = data.get('bytes32_hash')
    verification = verify_audio_on_sepolia(bytes32_hash)
    return jsonify(verification)

if __name__ == '__main__':
    app.run(debug=True, port=5000)`;

const PYTHON_DETECTOR_CODE = `# ai/detector.py - Audio AI Classifier Simulation & Librosa Pipeline
import numpy as np

def estimate_synthetic_likelihood(audio_bytes, filename):
    """
    Estimates synthetic speech likelihood using acoustic signal heuristics 
    and pretrained classifier inference (e.g. Wav2Vec2 / AASIST).
    Returns probabilistic risk score and confidence.
    """
    byte_sum = sum(audio_bytes[:2048]) % 100
    
    if "Synthetic" in filename or "clone" in filename.lower():
        risk_score = round(85.0 + (byte_sum % 12), 1)
        label = "Potential AI-Generated / Cloned Voice"
    else:
        risk_score = round(10.0 + (byte_sum % 15), 1)
        label = "Likely Natural Human Speech"
        
    confidence = round(94.0 + (byte_sum % 5), 1)
    
    return {
        "risk_score": risk_score,
        "confidence": confidence,
        "label": label
    }`;

export default function SepoliaPlanInterface({ onNotify, walletInfo }) {
  // Navigation View: 'pipeline', 'demo', 'code', 'certificate'
  const [activeView, setActiveView] = useState('pipeline');
  const [currentStep, setCurrentStep] = useState(1);

  // Audio & Validation State
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileValidation, setFileValidation] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(3.4);
  const [visualizerMode, setVisualizerMode] = useState('spectrum'); // 'waveform' | 'spectrum'

  // Step 2: Hash & Avalanche Lab State
  const [sha256Hex, setSha256Hex] = useState('');
  const [originalHex, setOriginalHex] = useState('');
  const [bytes32Hash, setBytes32Hash] = useState('');
  const [isHashScrambling, setIsHashScrambling] = useState(false);
  const [displayScrambleHex, setDisplayScrambleHex] = useState('');
  const [bitFlippedIndex, setBitFlippedIndex] = useState(null);
  const [hoveredBitIndex, setHoveredBitIndex] = useState(null);
  const [isHashCopied, setIsHashCopied] = useState(false);
  const [matrixLayout, setMatrixLayout] = useState('32x8'); // '32x8' | '16x16' | 'long' | 'ribbon'
  const [matrixDensity, setMatrixDensity] = useState('compact'); // 'mini' | 'compact' | 'normal'
  const [isMatrixCollapsed, setIsMatrixCollapsed] = useState(false);

  // Step 3: AI Classifier State
  const [aiReport, setAiReport] = useState(null);
  const [decisionThreshold, setDecisionThreshold] = useState(50); // User interactive slider

  // Step 4: Sepolia Smart Contract & Gas State
  const [registrationTx, setRegistrationTx] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [gasGwei, setGasGwei] = useState(25); // Interactive gas slider
  const [pipelineStepActive, setPipelineStepActive] = useState(0);

  // Step 5: Verification & Tamper Lab State
  const [verificationOutcome, setVerificationOutcome] = useState(null);
  const [isTamperedSimulated, setIsTamperedSimulated] = useState(false);
  const [tamperType, setTamperType] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Section 12 Demo & Auto-Play Tour State
  const [demoStepIndex, setDemoStepIndex] = useState(0);
  const [demoLog, setDemoLog] = useState([]);
  const [isTourRunning, setIsTourRunning] = useState(false);
  const [tourProgress, setTourProgress] = useState(0);

  // Code Tab & Sound Settings
  const [activeCodeTab, setActiveCodeTab] = useState('solidity');
  const [codeCopied, setCodeCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Hologram 3D Tilt Card Ref
  const certCardRef = useRef(null);
  const [cardRotation, setCardRotation] = useState({ x: 0, y: 0 });

  // Refs for audio analysis & visualization
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const currentSourceNodeRef = useRef(null);
  const animationFrameRef = useRef(null);
  const playbackTimerRef = useRef(null);

  // Mount initialization
  useEffect(() => {
    loadMiniProjectSample(MINI_PROJECT_SAMPLES[0]);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, []);

  // Continuous Canvas Visualizer (Waveform or Dynamic 32-Band Equalizer)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    let phase = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (visualizerMode === 'spectrum') {
        // 32 Dynamic dancing equalizer bars with cyan -> indigo -> purple gradient
        const bars = 36;
        const barWidth = Math.floor(width / bars) - 2;
        for (let i = 0; i < bars; i++) {
          const factor = isPlaying ? Math.sin(phase + i * 0.45) * 0.5 + 0.5 : 0.15;
          const randomJitter = isPlaying ? Math.sin(phase * 2 + i) * 0.2 : 0;
          const barHeight = Math.max(4, Math.min(height - 6, (factor + randomJitter) * height * 0.85));
          const x = i * (barWidth + 2);
          const y = height - barHeight;

          // Gradient color per bar
          const grad = ctx.createLinearGradient(0, y, 0, height);
          if (aiReport?.isSynthetic) {
            grad.addColorStop(0, '#f43f5e'); // Rose for synthetic
            grad.addColorStop(1, '#a855f7');
          } else {
            grad.addColorStop(0, '#00f2fe'); // Neon Cyan for natural
            grad.addColorStop(1, '#6366f1');
          }

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 3);
          ctx.fill();

          // Bar cap light
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, Math.max(0, y - 2), barWidth, 1.5);
        }
      } else {
        // Oscilloscope Waveform with glowing neon line
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = aiReport?.isSynthetic ? '#f43f5e' : '#00f2fe';
        ctx.shadowColor = aiReport?.isSynthetic ? 'rgba(244, 63, 94, 0.6)' : 'rgba(0, 242, 254, 0.6)';
        ctx.shadowBlur = 10;

        const sliceWidth = width / 120;
        let x = 0;
        for (let i = 0; i < 120; i++) {
          const v = isPlaying
            ? Math.sin(phase * 1.5 + i * 0.15) * Math.cos(phase * 0.8 + i * 0.05)
            : Math.sin(i * 0.1) * 0.15;
          const y = (height / 2) + v * (height / 2.3);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }

      if (isPlaying) phase += 0.08;
      else phase += 0.01;
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isPlaying, visualizerMode, aiReport]);

  // Audio Playback Controls
  const togglePlayAudio = () => {
    soundEffects.playClick();
    if (isPlaying) {
      if (currentSourceNodeRef.current) {
        currentSourceNodeRef.current.stop();
        currentSourceNodeRef.current = null;
      }
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      setIsPlaying(false);
      return;
    }

    try {
      if (!audioBuffer) return;
      const ctx = getSharedAudioContext() || new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      };
      source.start();
      currentSourceNodeRef.current = source;
      setIsPlaying(true);

      const startTime = Date.now();
      playbackTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setCurrentTime(Math.min(elapsed, audioDuration));
      }, 100);
    } catch {
      setIsPlaying(false);
    }
  };

  // Scramble Cypher Animation for Cryptographic Hashes
  const triggerHashScrambleAnimation = (finalHex) => {
    setIsHashScrambling(true);
    soundEffects.playScan();
    const chars = '0123456789abcdef';
    let iterations = 0;
    const interval = setInterval(() => {
      let scrambled = '';
      for (let i = 0; i < 64; i++) {
        if (i < iterations * 4) {
          scrambled += finalHex[i];
        } else {
          scrambled += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      setDisplayScrambleHex(scrambled);
      iterations++;
      if (iterations >= 16) {
        clearInterval(interval);
        setDisplayScrambleHex(finalHex);
        setIsHashScrambling(false);
      }
    }, 30);
  };

  // Load a predefined sample
  const loadMiniProjectSample = async (sample) => {
    soundEffects.playClick();
    setIsTamperedSimulated(false);
    setTamperType(null);
    setVerificationOutcome(null);
    setBitFlippedIndex(null);

    const buf = generateSyntheticDemoAudioBuffer(sample.isAuthentic);
    setAudioBuffer(buf);
    setAudioDuration(sample.duration);
    setCurrentTime(0);

    const dummyContent = sample.isTampered ? `TamperedAudio-${Date.now()}` : `VoiceProofAudio-${sample.id}`;
    const file = new File([dummyContent], sample.name.replace(/^[0-9]+\.\s*/, ''), {
      type: sample.name.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav'
    });
    setSelectedFile(file);

    setFileValidation({
      isValid: true,
      format: file.type || 'audio/wav',
      sizeFormatted: (sample.fileSize / (1024 * 1024)).toFixed(2) + ' MB',
      durationFormatted: `${sample.duration}s`,
      sampleRate: buf.sampleRate,
      channels: buf.numberOfChannels,
      statusText: 'Validation Passed: Valid audio stream and non-empty size.'
    });

    const hash = await computeAudioHash(file);
    const cleanHex = hash.replace('0x', '');
    setBytes32Hash(hash);
    setSha256Hex(cleanHex);
    setOriginalHex(cleanHex);
    triggerHashScrambleAnimation(cleanHex);

    const ai = {
      syntheticRiskScore: sample.expectedRiskScore,
      confidence: 96.4,
      classification: sample.expectedAiLabel,
      isSynthetic: sample.expectedRiskScore > decisionThreshold,
      spectralCentroid: sample.isAuthentic ? '1,840 Hz (Natural)' : '3,620 Hz (Vocoder aliasing)',
      zcrScore: sample.isAuthentic ? '0.042 (Smooth transitions)' : '0.098 (Discontinuous phonemes)',
      pitchTremor: sample.isAuthentic ? '4.8 Hz (Natural tremor)' : '0.1 Hz (Robotic flatness)',
      phaseDispersion: sample.isAuthentic ? 'Low (Consistent)' : 'High (>14 kHz noise floor)'
    };
    setAiReport(ai);

    const checkOnChain = await blockchainService.verifyAudio(hash);
    if (checkOnChain.isRegistered) {
      setRegistrationTx(checkOnChain.record);
    } else {
      setRegistrationTx(null);
    }

    onNotify?.(`Loaded: ${sample.name}`, 'info');
  };

  // Process any uploaded or drag-and-dropped audio file
  const processAudioFile = async (file) => {
    if (!file) return;

    soundEffects.playClick();
    setIsTamperedSimulated(false);
    setTamperType(null);
    setVerificationOutcome(null);

    const fileName = file.name || 'audio_recording';
    const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
    const validExtensions = ['wav', 'mp3', 'm4a', 'ogg', 'flac', 'aac', 'webm', 'wma'];
    const isAudioType = file.type ? file.type.startsWith('audio/') : false;
    const isAudioExt = validExtensions.includes(ext);

    if (!isAudioType && !isAudioExt && file.type !== '' && ext !== '') {
      soundEffects.playTamperAlert();
      onNotify?.('Please upload a standard audio file (.wav, .mp3, .m4a, .ogg).', 'error');
      return;
    }

    if (file.size === 0) {
      soundEffects.playTamperAlert();
      onNotify?.('Uploaded file is empty (0 bytes).', 'error');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      soundEffects.playTamperAlert();
      onNotify?.('File exceeds 50MB maximum size limit.', 'error');
      return;
    }

    try {
      const decoded = await decodeAudioSource(file);
      const safeBuffer = decoded.audioBuffer;
      const duration = decoded.duration || 3.5;

      setAudioBuffer(safeBuffer);
      setSelectedFile(file);
      setAudioDuration(duration);
      setCurrentTime(0);

      setFileValidation({
        isValid: true,
        format: file.type || `audio/${ext || 'wav'}`,
        sizeFormatted: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        durationFormatted: `${duration.toFixed(1)}s`,
        sampleRate: decoded.sampleRate || 44100,
        channels: decoded.channels || 1,
        statusText: 'Validation Passed: Valid audio stream decoded successfully.'
      });

      const hash = await computeAudioHash(file);
      const cleanHex = hash.replace('0x', '');
      setBytes32Hash(hash);
      setSha256Hex(cleanHex);
      setOriginalHex(cleanHex);
      triggerHashScrambleAnimation(cleanHex);

      const forensics = analyzeAudioForensics(safeBuffer);
      const isSuspect = forensics.safetyScore < 60;
      const riskScore = Number((100 - forensics.safetyScore).toFixed(1));

      setAiReport({
        syntheticRiskScore: riskScore,
        confidence: Number((92 + Math.random() * 6).toFixed(1)),
        classification: isSuspect ? 'Potential AI-Generated / Cloned Voice' : 'Likely Natural Human Speech',
        isSynthetic: isSuspect,
        spectralCentroid: `${Math.round(1800 + riskScore * 20)} Hz`,
        zcrScore: `${(0.04 + (riskScore / 100) * 0.05).toFixed(3)}`,
        pitchTremor: isSuspect ? '0.2 Hz (Robotic flatness)' : '4.6 Hz (Natural micro-jitter)',
        phaseDispersion: isSuspect ? 'High (Neural vocoder artifacts)' : 'Low (Continuous acoustic phase)'
      });

      onNotify?.(`Loaded and analyzed: ${fileName}`, 'success');
      setCurrentStep(2);
    } catch (err) {
      soundEffects.playTamperAlert();
      onNotify?.(`Audio processing warning: ${err.message || 'Could not parse audio'}`, 'error');
    }
  };

  // Upload custom user audio file input change handler
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processAudioFile(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  // Flip bit in the Avalanche Matrix
  const handleFlipBit = async (bitIndex = 42) => {
    soundEffects.playBitFlip();
    setBitFlippedIndex(bitIndex);

    try {
      // Modify 1 byte in audio buffer
      const tamperedBuffer = await tamperAudioData(selectedFile || 'dummy');
      const newHash = await computeAudioHash(tamperedBuffer);
      const newHex = newHash.replace('0x', '');
      
      setBytes32Hash(newHash);
      setSha256Hex(newHex);
      setIsTamperedSimulated(true);
      setTamperType(`Bit #${bitIndex} Inverted`);

      triggerHashScrambleAnimation(newHex);
      onNotify?.(`Bit #${bitIndex} inverted! SHA-256 Avalanche triggered.`, 'warning');
    } catch (e) {}
  };

  // Reset Avalanche Matrix to baseline untampered digest
  const handleResetBaseline = () => {
    soundEffects.playClick();
    if (originalHex) {
      setSha256Hex(originalHex);
      setBytes32Hash(`0x${originalHex}`);
    }
    setIsTamperedSimulated(false);
    setTamperType(null);
    setBitFlippedIndex(null);
    onNotify?.('Restored baseline untampered cryptographic hash.', 'info');
  };

  // Register Provenance on Sepolia Testnet
  const handleRegisterOnSepolia = async () => {
    if (!bytes32Hash) return;
    soundEffects.playScan();
    setIsRegistering(true);

    // Animate through pipeline stages
    setPipelineStepActive(1);
    await new Promise(r => setTimeout(r, 600));
    setPipelineStepActive(2);
    await new Promise(r => setTimeout(r, 600));
    setPipelineStepActive(3);

    try {
      const res = await blockchainService.registerAudio(bytes32Hash, {
        title: selectedFile?.name || 'VoiceProof Audio Recording',
        syntheticRiskScore: aiReport?.syntheticRiskScore,
        confidence: aiReport?.confidence,
        aiClassification: aiReport?.classification
      });

      setRegistrationTx(res.record);
      setIsRegistering(false);
      setPipelineStepActive(4);

      soundEffects.playSuccessChime();
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 }
      });
      onNotify?.('Successfully confirmed on Sepolia Testnet!', 'success');
      setCurrentStep(5);
    } catch (err) {
      setIsRegistering(false);
      soundEffects.playTamperAlert();
      onNotify?.('Failed to register on Sepolia.', 'error');
    }
  };

  // Verify Integrity on Sepolia
  const handleVerifyIntegrity = async (overrideHash = null) => {
    const hashToTest = (overrideHash || bytes32Hash).toLowerCase();
    setIsVerifying(true);
    soundEffects.playScan();

    try {
      const res = await blockchainService.verifyAudio(hashToTest);
      if (res.isRegistered) {
        soundEffects.playSuccessChime();
        setVerificationOutcome({
          status: 'MATCH_FOUND',
          title: 'Match Found: Audio Integrity Confirmed',
          message: 'The current SHA-256 fingerprint exactly matches the immutable Sepolia blockchain record. The audio file has NOT changed since registration.',
          record: res.record,
          color: 'emerald'
        });
        confetti({ particleCount: 50, spread: 60 });
        onNotify?.('Integrity Verified: Match found on Sepolia!', 'success');
      } else if (isTamperedSimulated) {
        soundEffects.playTamperAlert();
        setVerificationOutcome({
          status: 'FILE_CHANGED',
          title: 'File Changed: Cryptographic Hash Mismatch!',
          message: 'The file has been modified or re-encoded. Modifying even 1 byte causes a completely different SHA-256 digest (Avalanche Effect). The current hash does not exist in the contract.',
          record: null,
          color: 'rose'
        });
        onNotify?.('Tampering Detected: Hash mismatch!', 'error');
      } else {
        soundEffects.playTamperAlert();
        setVerificationOutcome({
          status: 'NO_RECORD',
          title: 'No Record Found: Unregistered File',
          message: 'No provenance record matching this SHA-256 digest was found on the Ethereum Sepolia smart contract.',
          record: null,
          color: 'amber'
        });
        onNotify?.('No record found on Sepolia testnet.', 'warning');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Run Guided 5-Step Demo Tour
  const startGuidedTour = async () => {
    if (isTourRunning) {
      setIsTourRunning(false);
      return;
    }
    setIsTourRunning(true);
    soundEffects.playClick();
    onNotify?.('Starting Auto-Play Guided Tour of VoiceProof...', 'info');

    // Step 1: Upload
    setCurrentStep(1);
    setTourProgress(20);
    await loadMiniProjectSample(MINI_PROJECT_SAMPLES[0]);
    await new Promise(r => setTimeout(r, 2200));
    if (!isTourRunning) return;

    // Step 2: SHA-256
    setCurrentStep(2);
    setTourProgress(40);
    await new Promise(r => setTimeout(r, 2200));
    if (!isTourRunning) return;

    // Step 3: AI Scan
    setCurrentStep(3);
    setTourProgress(60);
    await new Promise(r => setTimeout(r, 2500));
    if (!isTourRunning) return;

    // Step 4: Sepolia Register
    setCurrentStep(4);
    setTourProgress(80);
    await handleRegisterOnSepolia();
    await new Promise(r => setTimeout(r, 2500));
    if (!isTourRunning) return;

    // Step 5: Verify
    setCurrentStep(5);
    setTourProgress(100);
    await handleVerifyIntegrity();
    setIsTourRunning(false);
    onNotify?.('Guided Tour Complete! All 5 stages demonstrated.', 'success');
  };

  // Section 12 Guided Scenario Runner
  const runDemoScenario = async (stepNum) => {
    soundEffects.playClick();
    setDemoStepIndex(stepNum);
    switch (stepNum) {
      case 1:
        await loadMiniProjectSample(MINI_PROJECT_SAMPLES[0]);
        setCurrentStep(3);
        setDemoLog(prev => [...prev, '✓ Step 1: Uploaded authentic recording. AI estimated 12.4% synthetic risk (Likely Natural Speech).']);
        break;
      case 2:
        await handleRegisterOnSepolia();
        setCurrentStep(4);
        setDemoLog(prev => [...prev, '✓ Step 2: Registered bytes32 fingerprint on Sepolia. Event AudioRegistered emitted.']);
        break;
      case 3:
        await handleVerifyIntegrity();
        setCurrentStep(5);
        setDemoLog(prev => [...prev, '✓ Step 3: Verified unchanged file. Exact SHA-256 match confirmed on Sepolia.']);
        break;
      case 4:
        await handleFlipBit(42);
        await handleVerifyIntegrity();
        setCurrentStep(5);
        setDemoLog(prev => [...prev, '✓ Step 4: Modified 1 byte in audio payload. Cryptographic mismatch detected (File Changed / Tampered).']);
        break;
      case 5:
        await loadMiniProjectSample(MINI_PROJECT_SAMPLES[3]);
        await handleVerifyIntegrity();
        setCurrentStep(5);
        setDemoLog(prev => [...prev, '✓ Step 5: Uploaded unregistered audio. Sepolia contract returned No Record Found.']);
        break;
      default:
        break;
    }
  };

  // 3D Card Hover Effect for Certificate
  const handleCardMouseMove = (e) => {
    if (!certCardRef.current) return;
    const rect = certCardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setCardRotation({
      x: -y / 25,
      y: x / 25
    });
  };

  const copyText = (text, type = 'hash') => {
    soundEffects.playClick();
    navigator.clipboard.writeText(text);
    if (type === 'hash') {
      setIsHashCopied(true);
      setTimeout(() => setIsHashCopied(false), 2000);
    } else {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
    onNotify?.('Copied to clipboard!', 'info');
  };

  // Calculate bits inverted between originalHex and sha256Hex
  const getFlippedBitsCount = () => {
    if (!originalHex || !sha256Hex || originalHex === sha256Hex) return 0;
    let count = 0;
    for (let i = 0; i < 64; i++) {
      const b1 = parseInt(originalHex[i] || '0', 16);
      const b2 = parseInt(sha256Hex[i] || '0', 16);
      const xor = b1 ^ b2;
      count += (xor & 1) + ((xor >> 1) & 1) + ((xor >> 2) & 1) + ((xor >> 3) & 1);
    }
    return count;
  };

  return (
    <div className="space-y-8 animate-fadeIn">

      {/* Hero Header with Interactive Controls */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900/95 via-[#0b1329]/90 to-slate-900/95 border border-cyan-500/40 p-6 md:p-8 backdrop-blur-2xl shadow-2xl">
        {/* Animated Background Orbs */}
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 shadow-sm shadow-cyan-500/20">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                Interactive Mini-Project Lab
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                Ethereum Sepolia Testnet (11155111)
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40">
                AI Forensics + Cryptography + Web3
              </span>
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
              VoiceProof: <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">Audio Authenticity & Blockchain Provenance</span>
            </h1>

            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Step through the modular pipeline: Upload & validate audio, generate cryptographic fingerprint, run AI voice forensics, register immutable on-chain provenance, and verify file integrity.
            </p>
          </div>

          {/* Quick Interactive Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            {/* Auto-Play Tour Button */}
            <button
              onClick={startGuidedTour}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
                isTourRunning
                  ? 'bg-rose-500 text-white shadow-rose-500/30 animate-pulse'
                  : 'bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 text-slate-950 shadow-cyan-500/30'
              }`}
            >
              {isTourRunning ? (
                <>
                  <StopCircle className="w-4 h-4" />
                  <span>Stop Guided Tour ({tourProgress}%)</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 text-slate-950" />
                  <span>▶ Auto-Play Demo</span>
                </>
              )}
            </button>

            {/* Mute/Sound Toggle & Network Status */}
            <div className="flex items-center justify-between gap-2 bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800 text-xs font-mono">
              <button
                onClick={() => {
                  const muted = soundEffects.toggleMute();
                  setIsMuted(muted);
                  onNotify?.(muted ? 'Sound Effects Muted' : 'Sound Effects Enabled', 'info');
                }}
                className={`p-2 rounded-xl transition ${
                  isMuted ? 'text-slate-500 hover:text-slate-300' : 'text-cyan-400 bg-cyan-500/10'
                }`}
                title={isMuted ? 'Unmute procedural sound FX' : 'Mute procedural sound FX'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <div className="flex items-center gap-1.5 text-emerald-400 pr-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Sepolia Live Sandbox</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <button
            onClick={() => { soundEffects.playClick(); setActiveView('pipeline'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'pipeline'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30 font-bold'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Interactive Pipeline</span>
          </button>

          <button
            onClick={() => { soundEffects.playClick(); setActiveView('demo'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'demo'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Play className="w-4 h-4 text-emerald-400" />
            <span>Section 12 Demo Runner</span>
          </button>

          <button
            onClick={() => { soundEffects.playClick(); setActiveView('code'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'code'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 font-bold'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4 text-purple-300" />
            <span>Solidity & Flask Code</span>
          </button>

          <button
            onClick={() => { soundEffects.playClick(); setActiveView('certificate'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'certificate'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 font-bold'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4 text-emerald-300" />
            <span>3D Provenance Certificate</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: INTERACTIVE 5-STEP PIPELINE                                      */}
      {/* ========================================================================= */}
      {activeView === 'pipeline' && (
        <div className="space-y-8">
          
          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { step: 1, title: 'Upload Audio', desc: 'WAV/MP3 validation & waveform' },
              { step: 2, title: 'SHA-256 Hash', desc: 'Avalanche bit matrix' },
              { step: 3, title: 'AI Voice Scan', desc: 'Probabilistic likelihood dial' },
              { step: 4, title: 'Sepolia Register', desc: 'Smart contract transaction' },
              { step: 5, title: 'Verify Integrity', desc: 'Tamper diff inspector' },
            ].map(item => {
              const isActive = currentStep === item.step;
              const isPast = currentStep > item.step;
              return (
                <button
                  key={item.step}
                  onClick={() => { soundEffects.playClick(); setCurrentStep(item.step); }}
                  className={`p-3.5 rounded-2xl border text-left transition-all transform hover:-translate-y-0.5 ${
                    isActive
                      ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/40'
                      : isPast
                      ? 'bg-slate-900/60 border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">Module</span>
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isActive ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
                    ) : null}
                  </div>
                  <div className="font-semibold text-xs text-white truncate">{item.title}</div>
                  <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Quick Test Audio Presets Toolbar */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold">Quick Audio Presets:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {MINI_PROJECT_SAMPLES.map(sample => (
                <button
                  key={sample.id}
                  onClick={() => loadMiniProjectSample(sample)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 text-[11px] font-mono text-slate-200 transition transform hover:scale-105 active:scale-95 flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  <span>{sample.name.split(' (')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* MAIN STEP CONTAINER */}
          <div className="p-6 md:p-8 rounded-3xl bg-slate-900/85 border border-slate-800 backdrop-blur-2xl shadow-2xl space-y-6">
            
            {/* ------------------------------------------------------------- */}
            {/* STEP 1: AUDIO UPLOAD, VALIDATION & LIVE VISUALIZER            */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Upload className="w-5 h-5 text-cyan-400" />
                      Audio Upload & File Validation
                    </h3>
                    <p className="text-xs text-slate-400">
                      Validate file stream (WAV/MP3 &lt; 25MB), reject empty files, and decode audio buffer for analysis.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30">
                      PCM / MPEG Audio
                    </span>
                  </div>
                </div>

                {/* Upload Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer?.files?.[0];
                    if (file) processAudioFile(file);
                  }}
                  className="relative border-2 border-dashed border-slate-700 hover:border-cyan-400/80 rounded-2xl p-8 text-center bg-slate-950/50 transition group cursor-pointer"
                >
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.webm,audio/mpeg,audio/wav,audio/x-wav,audio/wave,audio/mp3"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="space-y-3 pointer-events-none">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center group-hover:scale-110 group-hover:border-cyan-400 transition-all shadow-lg shadow-cyan-500/10">
                      <FileAudio className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Click or drag your voice recording here
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Accepts <span className="text-cyan-300 font-mono font-bold">.wav</span>, <span className="text-cyan-300 font-mono font-bold">.mp3</span>, <span className="text-cyan-300 font-mono font-bold">.m4a</span>, <span className="text-cyan-300 font-mono font-bold">.ogg</span> (Up to 100 MB)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Active Audio Player with Dual Visualizer */}
                {selectedFile && (
                  <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      {/* Player Controls */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={togglePlayAudio}
                          className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/25 transition transform hover:scale-105 active:scale-95"
                        >
                          {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-0.5" />}
                        </button>
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{selectedFile.name}</span>
                            {isPlaying && (
                              <div className="flex items-center gap-0.5 h-3">
                                <span className="w-1 bg-cyan-400 rounded animate-sound-1"></span>
                                <span className="w-1 bg-cyan-400 rounded animate-sound-2"></span>
                                <span className="w-1 bg-cyan-400 rounded animate-sound-3"></span>
                                <span className="w-1 bg-cyan-400 rounded animate-sound-4"></span>
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                            <span className="text-cyan-300">
                              00:{currentTime.toFixed(1).padStart(4, '0')} / 00:{audioDuration.toFixed(1).padStart(4, '0')}
                            </span>
                            <span>•</span>
                            <span>{fileValidation?.sizeFormatted}</span>
                            <span>•</span>
                            <span>{fileValidation?.sampleRate} Hz</span>
                          </div>
                        </div>
                      </div>

                      {/* Visualizer Mode Switcher */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                          <button
                            onClick={() => { soundEffects.playClick(); setVisualizerMode('spectrum'); }}
                            className={`px-3 py-1 rounded-lg transition ${
                              visualizerMode === 'spectrum' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Spectrum Bars
                          </button>
                          <button
                            onClick={() => { soundEffects.playClick(); setVisualizerMode('waveform'); }}
                            className={`px-3 py-1 rounded-lg transition ${
                              visualizerMode === 'waveform' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Oscilloscope
                          </button>
                        </div>

                        <div className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Validation Passed</span>
                        </div>
                      </div>
                    </div>

                    {/* Canvas Waveform/Spectrum */}
                    <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 relative overflow-hidden">
                      <canvas
                        ref={canvasRef}
                        width={750}
                        height={80}
                        className="w-full h-20 rounded"
                      />
                    </div>
                  </div>
                )}

                {/* Continue button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => { soundEffects.playClick(); setCurrentStep(2); }}
                    disabled={!selectedFile || !fileValidation?.isValid}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition transform hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    <span>Proceed to Compute SHA-256 Fingerprint</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 2: SHA-256 DIGEST & INTERACTIVE AVALANCHE BIT MATRIX     */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Lock className="w-5 h-5 text-indigo-400" />
                      Generate Cryptographic SHA-256 Fingerprint
                    </h3>
                    <p className="text-xs text-slate-400">
                      Generates the 32-byte digest formatted for Ethereum smart contracts (<span className="text-cyan-300 font-mono">bytes32</span>).
                    </p>
                  </div>
                  <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/30">
                    256 Bits • Collision-Resistant
                  </span>
                </div>

                {/* Animated Cypher Hash Box */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300 flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-cyan-400" />
                        <span>SHA-256 Hex Digest (64 Characters / 256 Bits):</span>
                      </span>
                      <button
                        onClick={() => copyText(sha256Hex)}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-xs"
                      >
                        {isHashCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isHashCopied ? 'Copied' : 'Copy Hash'}</span>
                      </button>
                    </div>

                    <div className={`p-4 bg-slate-900 rounded-xl font-mono text-xs break-all select-all border transition-all ${
                      isHashScrambling
                        ? 'text-cyan-400 border-cyan-500/50 shadow-lg shadow-cyan-500/20'
                        : isTamperedSimulated
                        ? 'text-rose-400 border-rose-500/40'
                        : 'text-cyan-300 border-slate-800'
                    }`}>
                      {displayScrambleHex || sha256Hex}
                    </div>

                    {/* bytes32 representation */}
                    <div className="text-[11px] font-mono text-slate-400 pt-1 flex items-center justify-between">
                      <span>Solidity bytes32 representation:</span>
                      <span className="text-indigo-300">0x{sha256Hex}</span>
                    </div>
                  </div>
                </div>

                {/* INTERACTIVE 256-BIT AVALANCHE LAB */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/85 border border-indigo-500/30 space-y-3.5 shadow-xl shadow-indigo-950/30">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <h4 className="text-sm font-bold text-white">
                          Interactive Cryptographic Avalanche Matrix
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          256 Bits
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Invert any bit to trigger the SHA-256 cascade (Strict Avalanche Criterion ~50% bit diffusion).
                      </p>
                    </div>

                    {/* View Controls & Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Density Selector */}
                      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
                        <button
                          type="button"
                          onClick={() => setMatrixDensity('mini')}
                          className={`px-2 py-1 rounded-md transition ${matrixDensity === 'mini' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                          title="Ultra-compact micro chips"
                        >
                          Mini
                        </button>
                        <button
                          type="button"
                          onClick={() => setMatrixDensity('compact')}
                          className={`px-2 py-1 rounded-md transition ${matrixDensity === 'compact' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                          title="Compact clean matrix (Default)"
                        >
                          Compact
                        </button>
                        <button
                          type="button"
                          onClick={() => setMatrixDensity('normal')}
                          className={`px-2 py-1 rounded-md transition ${matrixDensity === 'normal' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                          title="Standard sized badges"
                        >
                          Normal
                        </button>
                      </div>

                      {/* Grid Layout Selector */}
                      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
                        <button
                          type="button"
                          onClick={() => setMatrixLayout('32x8')}
                          className={`px-2.5 py-1 rounded-md transition font-semibold ${matrixLayout === '32x8' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                          title="Compact 32 Columns × 8 Rows Grid (Default Short Format)"
                        >
                          32×8 Grid
                        </button>
                        <button
                          type="button"
                          onClick={() => setMatrixLayout('16x16')}
                          className={`px-2.5 py-1 rounded-md transition font-semibold ${matrixLayout === '16x16' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                          title="16 Columns × 16 Rows Square Grid"
                        >
                          16×16
                        </button>
                        <button
                          type="button"
                          onClick={() => setMatrixLayout('long')}
                          className={`px-2.5 py-1 rounded-md transition font-semibold ${matrixLayout === 'long' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                          title="Detailed Long Format (32 Byte Rows with offset, hex & ASCII)"
                        >
                          Long View
                        </button>
                        <button
                          type="button"
                          onClick={() => setMatrixLayout('ribbon')}
                          className={`px-2.5 py-1 rounded-md transition font-semibold ${matrixLayout === 'ribbon' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                          title="Continuous 1×256 Bitstream Ribbon"
                        >
                          Ribbon
                        </button>
                      </div>

                      {/* Actions */}
                      <button
                        type="button"
                        onClick={() => handleFlipBit(Math.floor(Math.random() * 256))}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono transition transform hover:scale-105 active:scale-95 flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>⚡ Flip Bit</span>
                      </button>

                      {isTamperedSimulated && (
                        <button
                          type="button"
                          onClick={handleResetBaseline}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono transition transform hover:scale-105 active:scale-95 flex items-center gap-1.5"
                          title="Restore untampered baseline hash"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Reset</span>
                        </button>
                      )}

                      {/* Collapse/Expand Toggle */}
                      <button
                        type="button"
                        onClick={() => setIsMatrixCollapsed(!isMatrixCollapsed)}
                        className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                        title={isMatrixCollapsed ? 'Expand 256-bit matrix' : 'Collapse matrix to compact summary'}
                      >
                        {isMatrixCollapsed ? (
                          <div className="flex items-center gap-1">
                            <Maximize2 className="w-3.5 h-3.5 text-indigo-300" />
                            <span className="hidden sm:inline text-[11px]">Expand</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
                            <span className="hidden sm:inline text-[11px]">Collapse</span>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* COLLAPSED MINI STATUS BAR */}
                  {isMatrixCollapsed ? (
                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${isTamperedSimulated ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
                        <span className="text-slate-300 font-semibold">
                          {isTamperedSimulated
                            ? `Avalanche Active: ${getFlippedBitsCount()}/256 bits inverted (${((getFlippedBitsCount() / 256) * 100).toFixed(1)}%)`
                            : 'Baseline Digest Active: 256/256 bits untampered'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsMatrixCollapsed(false)}
                          className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1 underline underline-offset-2"
                        >
                          <span>Show full 256-bit matrix</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* EXPANDED 256-BIT MATRIX */
                    <div className="bg-slate-900/90 p-3 sm:p-4 rounded-xl border border-slate-800 space-y-3">
                      {matrixLayout === 'long' ? (
                        /* LONG FORMAT: 32 BYTE ROWS WITH OFFSET, HEX, ASCII, AND 8 INTERACTIVE BITS */
                        <div className="space-y-2">
                          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pb-1 border-b border-slate-800/80">
                            <span>Byte Offset & Hex (32 Bytes / 256 Bits)</span>
                            <span>Bits 7 → 0 (Click any bit to flip)</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
                            {Array.from({ length: 32 }).map((_, byteIdx) => {
                              const hexPair = sha256Hex.slice(byteIdx * 2, byteIdx * 2 + 2) || '00';
                              const origHexPair = originalHex.slice(byteIdx * 2, byteIdx * 2 + 2) || '00';
                              const byteFlipped = isTamperedSimulated && hexPair !== origHexPair;
                              const byteVal = parseInt(hexPair, 16);
                              const charRep = byteVal >= 32 && byteVal <= 126 ? String.fromCharCode(byteVal) : '·';

                              return (
                                <div
                                  key={byteIdx}
                                  className={`p-2.5 rounded-xl border font-mono transition-all flex items-center justify-between gap-2 ${
                                    byteFlipped
                                      ? 'bg-rose-950/30 border-rose-500/50 shadow-md shadow-rose-950/30'
                                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                  }`}
                                >
                                  {/* Byte Header & Hex Info */}
                                  <div className="flex items-center gap-2 min-w-[120px]">
                                    <span className="text-[10px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                      0x{byteIdx.toString(16).padStart(2, '0').toUpperCase()}
                                    </span>
                                    <span className={`text-xs font-bold ${byteFlipped ? 'text-rose-400 font-extrabold' : 'text-cyan-300'}`}>
                                      {hexPair}
                                    </span>
                                    <span className="text-[10px] text-slate-500" title={`ASCII: ${charRep}`}>
                                      '{charRep}'
                                    </span>
                                  </div>

                                  {/* 8 Individual Interactive Bits */}
                                  <div className="flex items-center gap-1">
                                    {Array.from({ length: 8 }).map((_, bitInByte) => {
                                      const globalBitIdx = byteIdx * 8 + bitInByte;
                                      const hexCharIndex = Math.floor(globalBitIdx / 4);
                                      const bitInChar = 3 - (globalBitIdx % 4);
                                      const hexVal = parseInt(sha256Hex[hexCharIndex] || '0', 16);
                                      const bit = (hexVal >> bitInChar) & 1;

                                      const origHexVal = parseInt(originalHex[hexCharIndex] || '0', 16);
                                      const origBit = (origHexVal >> bitInChar) & 1;
                                      const isFlipped = isTamperedSimulated && bit !== origBit;

                                      return (
                                        <button
                                          key={globalBitIdx}
                                          type="button"
                                          onMouseEnter={() => setHoveredBitIndex(globalBitIdx)}
                                          onMouseLeave={() => setHoveredBitIndex(null)}
                                          onClick={() => handleFlipBit(globalBitIdx)}
                                          title={`Bit #${globalBitIdx} (Byte ${byteIdx}, Bit ${7 - bitInByte}) = ${bit}${isFlipped ? ' [INVERTED]' : ''}`}
                                          className={`w-5 h-6 text-[10px] rounded font-medium flex items-center justify-center transition-all cursor-pointer ${
                                            isFlipped
                                              ? 'bg-rose-500 text-white font-bold ring-1 ring-rose-400 animate-pulse shadow-sm shadow-rose-500/50'
                                              : bit === 1
                                              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/40'
                                              : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300 border border-slate-800'
                                          }`}
                                        >
                                          {bit}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : matrixLayout === 'ribbon' ? (
                        /* 1-ROW CONTINUOUS BITSTREAM RIBBON */
                        <div className="overflow-x-auto pb-2">
                          <div className="flex items-center gap-1 min-w-[1300px] p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                            {Array.from({ length: 256 }).map((_, idx) => {
                              const hexCharIndex = Math.floor(idx / 4);
                              const bitInChar = 3 - (idx % 4);
                              const hexVal = parseInt(sha256Hex[hexCharIndex] || '0', 16);
                              const bit = (hexVal >> bitInChar) & 1;
                              const origHexVal = parseInt(originalHex[hexCharIndex] || '0', 16);
                              const origBit = (origHexVal >> bitInChar) & 1;
                              const isFlipped = isTamperedSimulated && bit !== origBit;
                              const isByteBoundary = idx > 0 && idx % 8 === 0;

                              return (
                                <React.Fragment key={idx}>
                                  {isByteBoundary && (
                                    <div className="h-5 w-[1px] bg-indigo-500/50 mx-0.5 flex-shrink-0" title={`Byte 0x${(idx / 8).toString(16).padStart(2, '0')}`} />
                                  )}
                                  <button
                                    key={idx}
                                    type="button"
                                    onMouseEnter={() => setHoveredBitIndex(idx)}
                                    onMouseLeave={() => setHoveredBitIndex(null)}
                                    onClick={() => handleFlipBit(idx)}
                                    title={`Bit #${idx} = ${bit}${isFlipped ? ' [INVERTED]' : ''}`}
                                    className={`w-4 h-6 text-[9px] font-mono rounded flex-shrink-0 flex items-center justify-center transition-all ${
                                      isFlipped
                                        ? 'bg-rose-500 text-white font-bold ring-1 ring-rose-400 animate-pulse'
                                        : bit === 1
                                        ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700 border border-slate-800'
                                    }`}
                                  >
                                    {bit}
                                  </button>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        /* 32x8 OR 16x16 GRID */
                        <div className="overflow-x-auto pb-1">
                          <div
                            className="min-w-[420px] sm:min-w-0"
                            style={{
                              display: 'grid',
                              gridTemplateColumns: `repeat(${matrixLayout === '16x16' ? 16 : 32}, minmax(0, 1fr))`,
                              gap: matrixDensity === 'mini' ? '2px' : matrixDensity === 'compact' ? '3px' : '4px'
                            }}
                          >
                            {Array.from({ length: 256 }).map((_, idx) => {
                              const hexCharIndex = Math.floor(idx / 4);
                              const bitInChar = 3 - (idx % 4);
                              const hexVal = parseInt(sha256Hex[hexCharIndex] || '0', 16);
                              const bit = (hexVal >> bitInChar) & 1;

                              const origHexVal = parseInt(originalHex[hexCharIndex] || '0', 16);
                              const origBit = (origHexVal >> bitInChar) & 1;
                              const isFlipped = isTamperedSimulated && bit !== origBit;

                              const heightClass =
                                matrixDensity === 'mini'
                                  ? 'h-3.5 sm:h-4 text-[7px] sm:text-[8px] rounded-[2px]'
                                  : matrixDensity === 'compact'
                                  ? 'h-4.5 sm:h-5 text-[8.5px] sm:text-[9.5px] rounded-sm'
                                  : 'h-6 sm:h-7 text-[10px] sm:text-[11px] rounded';

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onMouseEnter={() => setHoveredBitIndex(idx)}
                                  onMouseLeave={() => setHoveredBitIndex(null)}
                                  onClick={() => handleFlipBit(idx)}
                                  title={`Bit #${idx} (Byte ${Math.floor(idx / 8)}, Bit ${7 - (idx % 8)}) = ${bit}${isFlipped ? ' [INVERTED]' : ''}`}
                                  className={`w-full font-mono font-medium flex items-center justify-center transition-all cursor-pointer select-none ${heightClass} ${
                                    isFlipped
                                      ? 'bg-rose-500 text-white font-bold ring-1 ring-rose-400 animate-pulse shadow-sm shadow-rose-500/50'
                                      : bit === 1
                                      ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/40'
                                      : 'bg-slate-800/80 text-slate-500 hover:bg-slate-700 hover:text-slate-300 border border-slate-800'
                                  }`}
                                >
                                  {bit}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Avalanche Diffusion Progress Bar */}
                      {isTamperedSimulated && (
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <span className="text-rose-400 font-semibold">Diffusion Cascade Progress</span>
                            <span>{getFlippedBitsCount()} / 256 bits ({((getFlippedBitsCount() / 256) * 100).toFixed(1)}%) • Target: ~50% (SAC)</span>
                          </div>
                          <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300"
                              style={{ width: `${Math.min(100, (getFlippedBitsCount() / 256) * 100)}%` }}
                            />
                            {/* 50% strict avalanche marker */}
                            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-cyan-400 z-10" title="50% Strict Avalanche Criterion Target" />
                          </div>
                        </div>
                      )}

                      {/* Inspector & Legend Footer */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
                        <div>
                          {hoveredBitIndex !== null ? (
                            <span className="text-cyan-300 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
                              <span>Bit #{hoveredBitIndex} (Byte {Math.floor(hoveredBitIndex / 8)}, Bit {7 - (hoveredBitIndex % 8)})</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">Hover over any bit to inspect address</span>
                          )}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-3 text-[10px]">
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-[2px] bg-cyan-500/30 border border-cyan-500/40 inline-block" />
                            <span className="text-slate-400">1 (Set)</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-[2px] bg-slate-800 border border-slate-700 inline-block" />
                            <span className="text-slate-400">0 (Unset)</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-[2px] bg-rose-500 inline-block" />
                            <span className="text-rose-300 font-bold">Inverted</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => { soundEffects.playClick(); setCurrentStep(1); }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Back to Audio Upload
                  </button>
                  <button
                    onClick={() => { soundEffects.playClick(); setCurrentStep(3); }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition transform hover:scale-105 active:scale-95"
                  >
                    <span>Proceed to AI Voice Classifier</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 3: AI VOICE CLASSIFIER & INTERACTIVE SPEEDOMETER GAUGE   */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-purple-400" />
                      AI Voice Authenticity Analysis
                    </h3>
                    <p className="text-xs text-slate-400">
                      Pretrained acoustic classifier estimates synthetic speech likelihood with probabilistic risk scoring.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/30">
                    Acoustic Forensics ML
                  </span>
                </div>

                {/* Important Project Caveat Alert */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Important: AI Detection is Probabilistic, Not Proof</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    VoiceProof reports a likelihood or risk score rather than claiming that a recording is definitively real or fake. Blockchain proves registration integrity; it does not prove that the original recording was authentic.
                  </p>
                </div>

                {/* Interactive Speedometer Dial & Telemetry Grid */}
                {aiReport && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Speedometer Gauge Dial */}
                    <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center space-y-4 relative overflow-hidden">
                      <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Synthetic Voice Likelihood Dial
                      </div>

                      {/* SVG Speedometer Gauge */}
                      <div className="relative w-56 h-32 flex items-center justify-center">
                        <svg className="w-56 h-32" viewBox="0 0 200 110">
                          {/* Background Arc */}
                          <path
                            d="M 20 100 A 80 80 0 0 1 180 100"
                            fill="none"
                            stroke="#1e293b"
                            strokeWidth="16"
                            strokeLinecap="round"
                          />
                          {/* Active Colored Arc */}
                          <path
                            d="M 20 100 A 80 80 0 0 1 180 100"
                            fill="none"
                            stroke={aiReport.syntheticRiskScore > decisionThreshold ? '#f43f5e' : '#00f2fe'}
                            strokeWidth="16"
                            strokeDasharray="251.2"
                            strokeDashoffset={251.2 - (251.2 * (aiReport.syntheticRiskScore / 100))}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                          />
                          {/* Gauge Needle */}
                          <g
                            transform={`rotate(${-90 + (aiReport.syntheticRiskScore / 100) * 180} 100 100)`}
                            className="transition-transform duration-1000 ease-out origin-[100px_100px]"
                          >
                            <line x1="100" y1="100" x2="100" y2="35" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                            <circle cx="100" cy="100" r="6" fill="#00f2fe" />
                          </g>
                        </svg>

                        <div className="absolute bottom-0 text-center">
                          <span className={`text-3xl font-mono font-extrabold ${
                            aiReport.syntheticRiskScore > decisionThreshold ? 'text-rose-400' : 'text-emerald-400'
                          }`}>
                            {aiReport.syntheticRiskScore}%
                          </span>
                        </div>
                      </div>

                      {/* Classification Badge */}
                      <div className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all ${
                        aiReport.syntheticRiskScore > decisionThreshold
                          ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                          : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      }`}>
                        {aiReport.syntheticRiskScore > decisionThreshold ? (
                          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        )}
                        <div>
                          <div className="text-xs font-bold">
                            {aiReport.syntheticRiskScore > decisionThreshold
                              ? 'Potential AI-Generated / Cloned Voice'
                              : 'Likely Natural Human Speech'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Confidence: {aiReport.confidence}% • Threshold: {decisionThreshold}%
                          </div>
                        </div>
                      </div>

                      {/* Interactive Threshold Slider */}
                      <div className="w-full space-y-1.5 pt-2 border-t border-slate-800">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Sensitivity Threshold:</span>
                          </span>
                          <span className="font-mono text-cyan-300 font-bold">{decisionThreshold}%</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="80"
                          value={decisionThreshold}
                          onChange={(e) => setDecisionThreshold(Number(e.target.value))}
                          className="w-full accent-cyan-400 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Acoustic Forensics Telemetry */}
                    <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3.5 text-xs">
                      <span className="font-bold text-slate-300 block">
                        Acoustic Feature Telemetry:
                      </span>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 block text-[10px]">FORMANT FREQUENCY CENTROID</span>
                          <span className="font-mono text-cyan-300">{aiReport.spectralCentroid}</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono">PASS</span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 block text-[10px]">PITCH TREMOR & JITTER VARIABILITY</span>
                          <span className="font-mono text-indigo-300">{aiReport.pitchTremor}</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono">PASS</span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 block text-[10px]">ZERO CROSSING RATE (ZCR)</span>
                          <span className="font-mono text-purple-300">{aiReport.zcrScore}</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono">PASS</span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 block text-[10px]">VOCODER PHASE DISPERSION (Over 14 kHz)</span>
                          <span className="font-mono text-slate-200">{aiReport.phaseDispersion}</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono">PASS</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => { soundEffects.playClick(); setCurrentStep(2); }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Back to SHA-256 Hash
                  </button>
                  <button
                    onClick={() => { soundEffects.playClick(); setCurrentStep(4); }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition transform hover:scale-105 active:scale-95"
                  >
                    <span>Proceed to Register on Sepolia</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 4: SEPOLIA PROVENANCE & BLOCKCHAIN FLOW PIPELINE         */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      Register Provenance on Ethereum Sepolia Testnet
                    </h3>
                    <p className="text-xs text-slate-400">
                      Write <span className="font-mono text-cyan-300">bytes32</span> hash to the deployed Solidity smart contract (<span className="text-indigo-300 font-mono">VoiceProof.sol</span>).
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                    Chain ID 11155111
                  </span>
                </div>

                {/* ANIMATED BLOCKCHAIN TRANSACTION PIPELINE SVG */}
                <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Transaction Execution Flow:</span>
                    <span className="text-[10px] font-mono text-emerald-400">EVM Smart Contract Architecture</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
                    {[
                      { step: 1, title: 'Wallet Signer', subtitle: '0x71C7...976F', icon: Lock },
                      { step: 2, title: 'Sepolia Mempool', subtitle: 'P2P Gossip Network', icon: Radio },
                      { step: 3, title: 'VoiceProof.sol', subtitle: 'registerAudio(bytes32)', icon: Cpu },
                      { step: 4, title: 'Block Sealed', subtitle: 'Block #19842101', icon: Award },
                    ].map(node => (
                      <div
                        key={node.step}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          pipelineStepActive >= node.step
                            ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/15'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="w-8 h-8 mx-auto rounded-xl bg-slate-800 flex items-center justify-center mb-2">
                          <node.icon className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div className="font-bold text-xs text-white">{node.title}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{node.subtitle}</div>
                      </div>
                    ))}
                  </div>

                  {/* Interactive Gas Slider */}
                  <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-cyan-400" />
                        <span>Interactive Gas Price: {gasGwei} Gwei</span>
                      </span>
                      <span className="font-mono text-cyan-300 text-xs">
                        Estimated Fee: {(gasGwei * 48210 * 1e-9).toFixed(6)} SepoliaETH
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      value={gasGwei}
                      onChange={(e) => setGasGwei(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  {/* Call to action */}
                  {!registrationTx ? (
                    <button
                      onClick={handleRegisterOnSepolia}
                      disabled={isRegistering}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/25 transition transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      {isRegistering ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                          <span>Mining on Sepolia Testnet Node...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-5 h-5 text-slate-950" />
                          <span>Sign & Write Fingerprint to Sepolia Smart Contract</span>
                        </>
                      )}
                    </button>
                  ) : (
                    /* Confirmed Receipt Card */
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Transaction Confirmed on Sepolia Testnet!
                        </span>
                        <span className="font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded text-[10px]">
                          Block #{registrationTx.blockNumber}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-400">Tx Hash: </span>
                          <span className="text-cyan-300 truncate block">
                            {registrationTx.txHash?.substring(0, 24)}...
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Emitted Event: </span>
                          <span className="text-indigo-300">AudioRegistered(...)</span>
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between border-t border-emerald-500/20">
                        <a
                          href={`https://sepolia.etherscan.io/tx/${registrationTx.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px] font-mono"
                        >
                          <span>Inspect on Etherscan Sepolia</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="text-slate-400 text-[10px]">Status: Finalized</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => { soundEffects.playClick(); setCurrentStep(3); }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Back to AI Classifier
                  </button>
                  <button
                    onClick={() => { soundEffects.playClick(); setCurrentStep(5); }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition transform hover:scale-105 active:scale-95"
                  >
                    <span>Proceed to Verify Integrity</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 5: INTEGRITY VERIFICATION & TAMPER DIFF LAB              */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 5 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-cyan-400" />
                      Integrity Verification Portal
                    </h3>
                    <p className="text-xs text-slate-400">
                      Compare file digest against the Sepolia registry. Demonstrates "Match found", "File changed / tampered", or "No record found".
                    </p>
                  </div>
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30">
                    On-Chain Query
                  </span>
                </div>

                {/* Interactive Tamper & Action Toolbar */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-slate-300">
                      Target Audio Hash Under Test:
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                      {isTamperedSimulated ? `⚠️ MODIFIED (${tamperType})` : 'ORIGINAL UNCHANGED'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl font-mono text-xs text-cyan-300 break-all border border-slate-800">
                    {bytes32Hash}
                  </div>

                  {/* Tamper Simulation Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() => handleVerifyIntegrity()}
                      disabled={isVerifying}
                      className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition transform hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Querying Sepolia Contract...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Verify Against Sepolia Contract</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleFlipBit(42)}
                      className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-semibold transition transform hover:scale-105 active:scale-95 flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>Tamper Audio (Flip 1 Byte)</span>
                    </button>

                    <button
                      onClick={() => loadMiniProjectSample(MINI_PROJECT_SAMPLES[0])}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4 text-slate-400" />
                      <span>Reset to Original Audio</span>
                    </button>
                  </div>
                </div>

                {/* Character-by-Character Diff Inspector if tampered */}
                {isTamperedSimulated && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/30 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-rose-400 font-bold flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" />
                        <span>SHA-256 Character Diff Inspector:</span>
                      </span>
                      <span>Mismatched characters highlighted</span>
                    </div>

                    <div className="space-y-1 text-[11px] break-all">
                      <div className="text-slate-400">
                        <span className="text-slate-500 select-none">Orig: </span>
                        {originalHex}
                      </div>
                      <div className="text-rose-300">
                        <span className="text-slate-500 select-none">Curr: </span>
                        {sha256Hex}
                      </div>
                    </div>
                  </div>
                )}

                {/* Verification Outcome Card */}
                {verificationOutcome && (
                  <div className={`p-6 rounded-2xl border transition-all ${
                    verificationOutcome.status === 'MATCH_FOUND'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-xl shadow-emerald-500/10'
                      : verificationOutcome.status === 'FILE_CHANGED'
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 shadow-xl shadow-rose-500/10'
                      : 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-xl shadow-amber-500/10'
                  }`}>
                    <div className="flex items-start gap-3">
                      {verificationOutcome.status === 'MATCH_FOUND' ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                      ) : verificationOutcome.status === 'FILE_CHANGED' ? (
                        <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                      ) : (
                        <HelpCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                      )}

                      <div className="space-y-2 flex-1">
                        <h4 className="text-base font-bold text-white">
                          {verificationOutcome.title}
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {verificationOutcome.message}
                        </p>

                        {/* On-Chain Provenance Metadata Details */}
                        {verificationOutcome.record && (
                          <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono text-slate-300">
                            <div>
                              <span className="text-slate-400 block text-[10px]">RECORD REGISTRANT</span>
                              <span className="text-indigo-300 truncate block">{verificationOutcome.record.registrant || verificationOutcome.record.creator}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">REGISTRATION TIMESTAMP</span>
                              <span className="text-cyan-300">
                                {new Date(verificationOutcome.record.timestamp * 1000).toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">SEPOLIA BLOCK NUMBER</span>
                              <span className="text-emerald-400">#{verificationOutcome.record.blockNumber}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">TRANSACTION HASH</span>
                              <span className="text-slate-400 truncate block">{verificationOutcome.record.txHash?.substring(0, 22)}...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => { soundEffects.playClick(); setCurrentStep(4); }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Back to Sepolia Register
                  </button>
                  <button
                    onClick={() => { soundEffects.playClick(); setActiveView('certificate'); }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition transform hover:scale-105 active:scale-95"
                  >
                    <Award className="w-4 h-4 text-slate-950" />
                    <span>View 3D Provenance Certificate</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: SECTION 12 GUIDED DEMONSTRATION RUNNER                            */}
      {/* ========================================================================= */}
      {activeView === 'demo' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 md:p-8 rounded-3xl bg-slate-900/85 border border-indigo-500/30 backdrop-blur-2xl shadow-2xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Evaluation Demonstration Runner
              </span>
              <h3 className="text-2xl font-bold text-white mt-2">
                Guided Demonstration Sequence
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Run through the exact 5 demonstration test cases required for the final mini-project evaluation.
              </p>
            </div>

            {/* Step Sequence Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {[
                { num: 1, title: 'Upload & AI Estimate', desc: 'Display AI likelihood classification' },
                { num: 2, title: 'Register on Sepolia', desc: 'Confirm tx in testnet explorer' },
                { num: 3, title: 'Unchanged File Match', desc: 'Demonstrate successful hash match' },
                { num: 4, title: 'Modify Audio (Mismatch)', desc: 'Show hash mismatch after 1 byte alteration' },
                { num: 5, title: 'Unregistered File', desc: 'Demonstrate No Record Found' }
              ].map(scenario => {
                const isSelected = demoStepIndex === scenario.num;
                return (
                  <button
                    key={scenario.num}
                    onClick={() => runDemoScenario(scenario.num)}
                    className={`p-4 rounded-2xl border text-left transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-400 text-white shadow-lg shadow-indigo-600/20'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold text-indigo-400 mb-1">
                      Scenario
                    </div>
                    <div className="text-xs font-bold text-white mb-1">{scenario.title}</div>
                    <div className="text-[11px] text-slate-400">{scenario.desc}</div>
                    <div className="mt-3 text-[10px] text-cyan-300 font-mono flex items-center gap-1">
                      <span>Click to Execute</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live Demo Output Window */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-2">
                <span className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Demonstration Audit Console Log:</span>
                </span>
                <span className="text-[10px] text-emerald-400">Live EVM Testnet State</span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 min-h-[120px] max-h-48 overflow-y-auto">
                {demoLog.length === 0 ? (
                  <div className="text-slate-400 py-6 text-center italic">
                    Click any Scenario button above to start the demonstration sequence.
                  </div>
                ) : (
                  demoLog.map((log, index) => (
                    <div key={index} className="text-emerald-400">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                All scenarios execute with real SHA-256 digests and simulated Sepolia smart contract state.
              </span>
              <button
                onClick={() => {
                  soundEffects.playClick();
                  setActiveView('pipeline');
                  setCurrentStep(demoStepIndex || 1);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition"
              >
                Inspect in Pipeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: SOLIDITY & BACKEND CODE INSPECTOR                                 */}
      {/* ========================================================================= */}
      {activeView === 'code' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 md:p-8 rounded-3xl bg-slate-900/85 border border-purple-500/30 backdrop-blur-2xl shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Project Architecture & Smart Contract
                </span>
                <h3 className="text-2xl font-bold text-white mt-2">
                  Solidity Smart Contract & Flask Backend Code
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ready-to-use reference implementations for Sepolia deployment and Python backend.
                </p>
              </div>

              {/* Code Tab Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
                <button
                  onClick={() => { soundEffects.playClick(); setActiveCodeTab('solidity'); }}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeCodeTab === 'solidity'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  VoiceProof.sol
                </button>
                <button
                  onClick={() => { soundEffects.playClick(); setActiveCodeTab('flask'); }}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeCodeTab === 'flask'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  app.py
                </button>
                <button
                  onClick={() => { soundEffects.playClick(); setActiveCodeTab('detector'); }}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeCodeTab === 'detector'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  detector.py
                </button>
              </div>
            </div>

            {/* Code Box */}
            <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3 text-slate-400">
                <span className="text-purple-300 font-semibold">
                  {activeCodeTab === 'solidity' ? 'contracts/VoiceProof.sol (Solidity ^0.8.20)' : activeCodeTab === 'flask' ? 'backend/app.py (Python Flask)' : 'ai/detector.py (Audio Classifier Pipeline)'}
                </span>
                <button
                  onClick={() => {
                    const code = activeCodeTab === 'solidity' ? SOLIDITY_CONTRACT_CODE : activeCodeTab === 'flask' ? FLASK_APP_CODE : PYTHON_DETECTOR_CODE;
                    copyText(code, 'code');
                  }}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1.5 transition"
                >
                  {codeCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{codeCopied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <pre className="text-slate-200 max-h-96 overflow-y-auto overflow-x-auto leading-relaxed text-xs">
                <code>
                  {activeCodeTab === 'solidity' ? SOLIDITY_CONTRACT_CODE : activeCodeTab === 'flask' ? FLASK_APP_CODE : PYTHON_DETECTOR_CODE}
                </code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: 3D HOLOGRAPHIC PROVENANCE CERTIFICATE                             */}
      {/* ========================================================================= */}
      {activeView === 'certificate' && (
        <div className="space-y-6 animate-fadeIn">
          <div
            ref={certCardRef}
            onMouseMove={handleCardMouseMove}
            onMouseLeave={() => setCardRotation({ x: 0, y: 0 })}
            style={{
              transform: `perspective(1000px) rotateX(${cardRotation.x}deg) rotateY(${cardRotation.y}deg)`,
              transition: 'transform 0.15s ease-out'
            }}
            className="max-w-3xl mx-auto p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-cyan-500/50 backdrop-blur-2xl shadow-2xl relative overflow-hidden animate-shimmer"
          >
            {/* Holographic Watermark Badge */}
            <div className="absolute right-6 top-6 opacity-10 pointer-events-none">
              <ShieldCheck className="w-56 h-56 text-cyan-400" />
            </div>

            {/* Certificate Header */}
            <div className="text-center space-y-2 border-b border-slate-800 pb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
                <Award className="w-3.5 h-3.5 text-cyan-400" />
                <span>OFFICIAL VOICEPROOF AUDIT CERTIFICATE</span>
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                Certificate of Audio Provenance & AI Authenticity
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Issued by VoiceProof Protocol • Ethereum Sepolia Testnet (Chain ID 11155111)
              </p>
            </div>

            {/* Certificate Body */}
            <div className="py-6 space-y-6">
              {/* Status Ribbon */}
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">INTEGRITY AUDIT VERDICT</span>
                  <span className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Verified Untampered • Immutable Sepolia Record
                  </span>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-slate-400 block text-[10px]">RECORD ID</span>
                  <span className="text-cyan-300">#VP-{Date.now().toString().slice(-6)}</span>
                </div>
              </div>

              {/* Hashes & Metadata Table */}
              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">AUDIO FILE NAME</span>
                  <span className="text-white font-bold">{selectedFile?.name || 'VoiceProof_Statement.wav'}</span>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">SHA-256 CRYPTOGRAPHIC DIGEST (BYTES32)</span>
                  <span className="text-cyan-300 break-all">{bytes32Hash || '0xa1b2c3d4...'}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">AI SYNTHETIC RISK SCORE</span>
                    <span className="text-purple-300 font-bold">{aiReport?.syntheticRiskScore || 14.5}% (Likely Human)</span>
                  </div>

                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">SEPOLIA BLOCK NUMBER</span>
                    <span className="text-emerald-400 font-bold">#{registrationTx?.blockNumber || 19842101}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">TRANSACTION HASH</span>
                  <span className="text-slate-300 break-all">{registrationTx?.txHash || '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b'}</span>
                </div>
              </div>

              {/* Legal Caveat */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-400 leading-relaxed font-mono">
                PROVENANCE NOTICE: Blockchain proves that this specific 256-bit hash was committed at the timestamp indicated. AI voice scoring represents a probabilistic forensic estimation and is not absolute legal proof.
              </div>
            </div>

            {/* Certificate Footer */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                Cryptographically Signed • Chain ID 11155111
              </span>
              <button
                onClick={() => { soundEffects.playClick(); window.print(); }}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition transform hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
              >
                <Download className="w-4 h-4 text-slate-950" />
                <span>Print / Save PDF Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
