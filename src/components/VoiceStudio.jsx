import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, Play, Pause, ShieldCheck, AlertTriangle, Cpu, Sparkles, CheckCircle2, Lock, FileAudio, RefreshCw, Award, ArrowRight } from 'lucide-react';
import { decodeAudioSource, analyzeAudioForensics } from '../utils/audioAnalyzer';
import { computeAudioHash, computePerceptualAudioHash, formatEIP712Payload, signEIP712Payload } from '../utils/cryptoHasher';
import { PRESET_AUDIO_SAMPLES, generateSyntheticDemoAudioBuffer } from '../utils/presetAudio';
import confetti from 'canvas-confetti';

export default function VoiceStudio({ onRegisterProof, onNotify, walletInfo }) {
  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioFile, setAudioFile] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Forensics state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [forensicsReport, setForensicsReport] = useState(null);
  const [audioHash, setAudioHash] = useState('');
  const [pHash, setPHash] = useState('');
  
  // Mint metadata form
  const [title, setTitle] = useState('');
  const [speakerName, setSpeakerName] = useState('Dr. Elena Rostova');
  const [organization, setOrganization] = useState('Global Quantum Dynamics');
  const [ipfsURI, setIpfsURI] = useState('');
  const [isMinting, setIsMinting] = useState(false);

  // Canvas refs for visualizer
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const currentAudioSourceNode = useRef(null);

  // Load default demo preset on mount
  useEffect(() => {
    loadPresetSample(PRESET_AUDIO_SAMPLES[0]);
  }, []);

  // Handle preset sample loading
  const loadPresetSample = async (preset) => {
    try {
      setIsAnalyzing(true);
      setTitle(preset.title);
      setSpeakerName(preset.speaker);
      setOrganization(preset.organization);
      setIpfsURI(preset.ipfsURI);

      // Generate synthetic AudioBuffer corresponding to authentic vs deepfake
      const demoBuffer = generateSyntheticDemoAudioBuffer(preset.isAuthentic);
      const report = analyzeAudioForensics(demoBuffer);
      
      // Override with preset specific hashes for consistency
      setForensicsReport(report);
      setAudioHash(preset.audioHash);
      setPHash(preset.pHash);
      setAudioFile({ name: `${preset.title}.wav`, size: 1048576 });

      drawSpectrogram(report.spectrogramData, report.waveformPoints);
      setIsAnalyzing(false);
    } catch (err) {
      console.error('Failed to load preset:', err);
      setIsAnalyzing(false);
    }
  };

  // Start Microphone Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const file = new File([audioBlob], `live_record_${Date.now()}.wav`, { type: 'audio/wav' });
        await processUploadedAudio(file);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      onNotify('Live microphone recording started...', 'info');
    } catch (err) {
      onNotify('Microphone access denied or unsupported.', 'error');
    }
  };

  // Stop Microphone Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  // Process File Upload or Recorded Blob
  const processUploadedAudio = async (file) => {
    try {
      setIsAnalyzing(true);
      setAudioFile(file);
      setTitle(file.name.replace(/\.[^/.]+$/, ''));

      // 1. Decode Audio
      const { audioBuffer } = await decodeAudioSource(file);

      // 2. Compute Hashes
      const sha256 = await computeAudioHash(file);
      const perceptualHash = computePerceptualAudioHash(audioBuffer);
      setAudioHash(sha256);
      setPHash(perceptualHash);
      setIpfsURI(`ipfs://QmVoiceProof${sha256.substring(2, 14)}`);

      // 3. Analyze Forensics
      const report = analyzeAudioForensics(audioBuffer);
      setForensicsReport(report);

      // 4. Draw Canvas Spectrogram
      drawSpectrogram(report.spectrogramData, report.waveformPoints);

      setIsAnalyzing(false);
      onNotify('AI Forensics Analysis Complete!', 'success');
    } catch (err) {
      console.error('Audio processing failed:', err);
      setIsAnalyzing(false);
      onNotify('Failed to analyze audio file. Please try another file.', 'error');
    }
  };

  // File Drop Handler
  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedAudio(e.dataTransfer.files[0]);
    }
  };

  // Draw Audio Spectrogram on Canvas
  const drawSpectrogram = (spectrogramData, waveformPoints) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background grid
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw Spectrogram Columns
    if (spectrogramData && spectrogramData.length > 0) {
      const colWidth = width / spectrogramData.length;
      const numBins = spectrogramData[0].length;
      const rowHeight = height / numBins;

      for (let x = 0; x < spectrogramData.length; x++) {
        for (let y = 0; y < numBins; y++) {
          const val = spectrogramData[x][y];
          if (val > 0.02) {
            // Neon cyan to indigo/purple gradient map
            const r = Math.floor(val * 180);
            const g = Math.floor(val * 242);
            const b = Math.floor(255);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${val * 0.9})`;
            ctx.fillRect(x * colWidth, height - (y + 1) * rowHeight, colWidth + 0.5, rowHeight + 0.5);
          }
        }
      }
    }

    // Draw Waveform Overlay Line
    if (waveformPoints && waveformPoints.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.8)';
      ctx.lineWidth = 2;
      const step = width / waveformPoints.length;
      ctx.moveTo(0, height / 2);

      for (let i = 0; i < waveformPoints.length; i++) {
        const amp = waveformPoints[i] * (height / 2.5);
        const y = (i % 2 === 0) ? (height / 2 - amp) : (height / 2 + amp);
        ctx.lineTo(i * step, y);
      }
      ctx.stroke();
    }
  };

  // Submit & Mint Provenance on EVM Blockchain
  const handleMintProof = async () => {
    if (!audioHash || !forensicsReport) {
      onNotify('Please analyze an audio clip before minting.', 'error');
      return;
    }

    try {
      setIsMinting(true);
      onNotify('Generating EIP-712 cryptographic signature...', 'info');

      // 1. EIP-712 Payload
      const payload = formatEIP712Payload(
        audioHash,
        pHash,
        forensicsReport.authenticityScoreInt,
        title || 'Untitled Recording',
        ipfsURI
      );

      // 2. Sign signature
      const signature = await signEIP712Payload(null, payload);

      // 3. Register on Smart Contract
      const res = await onRegisterProof({
        audioHash,
        pHash,
        authenticityScoreInt: forensicsReport.authenticityScoreInt,
        title: title || 'Untitled Recording',
        ipfsURI: ipfsURI || `ipfs://QmVoiceProof${audioHash.substring(2, 10)}`,
        signature
      });

      setIsMinting(false);
      
      // Trigger Celebration Confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f2fe', '#4facfe', '#7f00ff', '#10b981']
      });

      onNotify(`Voice Proof Minted Successfully! Tx Hash: ${res.txHash.substring(0, 10)}...`, 'success');
    } catch (err) {
      console.error('Minting failed:', err);
      setIsMinting(false);
      onNotify(err.message || 'Failed to mint voice proof on EVM.', 'error');
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Sample Demo Selectors */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono text-slate-300">Quick Test Samples:</span>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {PRESET_AUDIO_SAMPLES.map((preset) => (
            <button
              key={preset.id}
              onClick={() => loadPresetSample(preset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                preset.isAuthentic
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
              }`}
            >
              {preset.isAuthentic ? <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
              <span>{preset.speaker} ({preset.isAuthentic ? 'Authentic' : 'Deepfake'})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Recording & File Upload Controls */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Mic className="w-5 h-5 text-cyan-400" />
              <span>Voice Capture & Input</span>
            </h2>

            {/* Mic Live Recorder Card */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center mb-6">
              <div className="flex items-center justify-center mb-3">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isRecording 
                    ? 'bg-rose-500/20 text-rose-400 border-2 border-rose-500 animate-ping'
                    : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                }`}>
                  <Mic className="w-8 h-8" />
                </div>
              </div>

              {isRecording ? (
                <div>
                  <span className="text-rose-400 font-mono text-sm font-bold block mb-2">
                    RECORDING LIVE... ({recordingTime}s)
                  </span>
                  <button
                    onClick={stopRecording}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-2 mx-auto shadow-lg shadow-rose-600/30 transition"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Stop Recording & Analyze</span>
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-slate-400 mb-3">Record live speech directly from your microphone</p>
                  <button
                    onClick={startRecording}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 mx-auto shadow-lg shadow-cyan-500/20 transition"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Start Microphone Recording</span>
                  </button>
                </div>
              )}
            </div>

            {/* Drag & Drop File Upload Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="border-2 border-dashed border-slate-700/80 hover:border-cyan-500/50 rounded-2xl p-6 text-center transition-all bg-slate-950/40 hover:bg-slate-900/60 cursor-pointer"
            >
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.webm,audio/mpeg,audio/wav,audio/x-wav,audio/wave,audio/mp3"
                onChange={(e) => {
                  if (e.target.files?.[0]) processUploadedAudio(e.target.files[0]);
                  e.target.value = '';
                }}
                className="hidden"
                id="voice-file-upload"
              />
              <label htmlFor="voice-file-upload" className="cursor-pointer block">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-slate-200 block mb-1">
                  Drop audio clip here or click to browse
                </span>
                <span className="text-[11px] text-slate-400 block font-mono">
                  Supports .WAV, .MP3, .M4A, .OGG (Max 50MB)
                </span>
              </label>
            </div>

            {audioFile && (
              <div className="mt-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileAudio className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="text-slate-200 truncate font-mono">{audioFile.name}</span>
                </div>
                <span className="text-slate-400 font-mono text-[10px]">Ready</span>
              </div>
            )}
          </div>

          {/* Cryptographic Hashes Card */}
          {audioHash && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-4">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                <span>Extracted Hashes & Fingerprints</span>
              </h3>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">SHA-256 Audio Hash (Bit-Exact Integrity)</label>
                <div className="p-2.5 rounded-xl bg-slate-950 font-mono text-[11px] text-cyan-300 border border-slate-800 break-all select-all">
                  {audioHash}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Perceptual Audio Hash (pHash)</label>
                <div className="p-2.5 rounded-xl bg-slate-950 font-mono text-[11px] text-purple-300 border border-slate-800 break-all select-all">
                  {pHash}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Visualizer & AI Forensics Inspection */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl">
            
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                <span>AI DSP Spectrogram & Forensics</span>
              </h2>
              {isAnalyzing && (
                <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning Spectral Features...</span>
                </div>
              )}
            </div>

            {/* Spectrogram Canvas */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 mb-6">
              <canvas
                ref={canvasRef}
                width={600}
                height={160}
                className="w-full h-40 object-cover"
              />
              <div className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-900/80 text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                0Hz - 22kHz Spectrum
              </div>
            </div>

            {/* Forensics Verdict & Metrics */}
            {forensicsReport ? (
              <div className="space-y-6">
                
                {/* Score Banner */}
                <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                  forensicsReport.authenticityScorePercent > 70
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold font-mono border ${
                      forensicsReport.authenticityScorePercent > 70
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    }`}>
                      {forensicsReport.authenticityScorePercent}%
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">{forensicsReport.verdict}</h3>
                      <p className="text-xs opacity-90">Confidence: {forensicsReport.confidenceLevel} • Risk: {forensicsReport.deepfakeRisk}</p>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider ${
                    forensicsReport.authenticityScorePercent > 70
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {forensicsReport.authenticityScorePercent > 70 ? 'AUTHENTIC SPEECH' : 'DEEPFAKE SYNTHETIC'}
                  </span>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 block">Pitch Micro-Jitter</span>
                    <span className="text-sm font-bold font-mono text-cyan-300">{forensicsReport.metrics.pitchMicroJitter}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 block">Robotic Flatness</span>
                    <span className="text-sm font-bold font-mono text-indigo-300">{forensicsReport.metrics.roboticPitchFlatness}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 block">Vocoder Aliasing</span>
                    <span className="text-sm font-bold font-mono text-purple-300">{forensicsReport.metrics.neuralArtifactCount} spikes</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 block">Zero Crossing Rate</span>
                    <span className="text-sm font-bold font-mono text-slate-200">{forensicsReport.metrics.zeroCrossingRate}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 block">Silence Noise Floor</span>
                    <span className="text-sm font-bold font-mono text-slate-200">{forensicsReport.metrics.noiseFloorDb}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 block">Sample Rate</span>
                    <span className="text-sm font-bold font-mono text-slate-200">{forensicsReport.metrics.sampleRate}</span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 font-mono text-xs">
                Select or record audio to generate AI DSP spectral report
              </div>
            )}
          </div>

          {/* Blockchain Mint Form */}
          {forensicsReport && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-400" />
                <span>Anchor Voice Provenance on EVM Blockchain</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Recording Title / Subject</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. CEO Quarterly Press Statement"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Speaker Name</label>
                  <input
                    type="text"
                    value={speakerName}
                    onChange={(e) => setSpeakerName(e.target.value)}
                    placeholder="e.g. Dr. Elena Rostova"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">IPFS URI Metadata Pointer</label>
                <input
                  type="text"
                  value={ipfsURI}
                  onChange={(e) => setIpfsURI(e.target.value)}
                  placeholder="ipfs://Qm..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                onClick={handleMintProof}
                disabled={isMinting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isMinting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing EIP-712 & Minting on EVM...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>Mint Immutable Voice Provenance Pass</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
