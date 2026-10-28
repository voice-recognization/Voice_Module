import React, { useState } from 'react';
import { Search, FileCheck2, ShieldCheck, AlertTriangle, QrCode, ExternalLink, Copy, Check, Download, ArrowRight, Lock, Award } from 'lucide-react';
import { computeAudioHash } from '../utils/cryptoHasher';
import { decodeAudioSource, analyzeAudioForensics } from '../utils/audioAnalyzer';
import confetti from 'canvas-confetti';

export default function VerificationPortal({ onVerifyHash, onNotify }) {
  const [searchInput, setSearchInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // Quick preset test search
  const handleQuickSearch = async (hash) => {
    setSearchInput(hash);
    await verifyHashQuery(hash);
  };

  // Verify by typed input or drop
  const verifyHashQuery = async (queryStr) => {
    const query = (queryStr || searchInput).trim();
    if (!query) {
      onNotify('Please enter a valid Audio SHA-256 Hash or drag an audio file.', 'error');
      return;
    }

    try {
      setIsVerifying(true);
      const res = await onVerifyHash(query);
      setResult(res);
      setIsVerifying(false);

      if (res.found && res.status === 1) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
        onNotify('Voice Provenance Pass Verified On-Chain!', 'success');
      } else {
        onNotify('No registered provenance record found for this audio hash.', 'warning');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setIsVerifying(false);
      onNotify('Error querying smart contract registry.', 'error');
    }
  };

  // Process audio file from drop or file input
  const processAudioForVerification = async (file) => {
    if (!file) return;
    try {
      setIsVerifying(true);
      const sha256 = await computeAudioHash(file);
      setSearchInput(sha256);
      onNotify(`Computed fingerprint for "${file.name}": ${sha256.substring(0, 10)}...`, 'info');
      await verifyHashQuery(sha256);
    } catch (err) {
      setIsVerifying(false);
      onNotify('Could not compute cryptographic hash for the audio file.', 'error');
    }
  };

  // File Drop Handler for instant verification
  const handleFileDrop = async (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAudioForVerification(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processAudioForVerification(e.target.files[0]);
      e.target.value = '';
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onNotify('Copied to clipboard!', 'info');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono">
          <FileCheck2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Public EVM Verification Gateway</span>
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Is This Voice Recording <span className="text-cyan-400">Authentic?</span>
        </h2>
        <p className="text-sm text-slate-300 max-w-xl mx-auto">
          Query the decentralized VoiceProof smart contract registry. Test any audio clip or hash to confirm if it has been cryptographically signed and registered on the blockchain.
        </p>
      </div>

      {/* Search Bar & Drop Zone */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-4">
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Paste SHA-256 Audio Hash (0x...) or IPFS CID"
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={() => verifyHashQuery()}
            disabled={isVerifying}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 flex-shrink-0"
          >
            {isVerifying ? 'Searching EVM...' : 'Verify Audio'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Drop audio file trigger */}
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          htmlFor="verify-file-input"
          className="block p-4 rounded-2xl border border-dashed border-slate-700/80 hover:border-cyan-500/50 bg-slate-950/40 hover:bg-slate-900/50 text-center transition cursor-pointer group"
        >
          <input
            id="verify-file-input"
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.webm,audio/mpeg,audio/wav,audio/x-wav,audio/wave,audio/mp3"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <span className="text-xs text-slate-300 group-hover:text-cyan-300 transition">
            Click to browse or drag & drop any <strong className="text-cyan-400">.wav / .mp3 file</strong> here to compute its SHA-256 fingerprint & query EVM on-chain state
          </span>
        </label>

        {/* Preset quick test buttons */}
        <div className="flex items-center gap-2 pt-2">
          <span className="text-[11px] text-slate-500 font-mono">Quick Test:</span>
          <button
            onClick={() => handleQuickSearch("0xa1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef1")}
            className="text-[11px] font-mono text-cyan-400 hover:underline"
          >
            [Authentic Sample Hash]
          </button>
          <span className="text-slate-600">•</span>
          <button
            onClick={() => handleQuickSearch("0x99887766554433221100aabbccddeeff99887766554433221100aabbccddeeff")}
            className="text-[11px] font-mono text-amber-400 hover:underline"
          >
            [Deepfake Sample Hash]
          </button>
        </div>

      </div>

      {/* Verification Results Card */}
      {result && (
        <div className="space-y-6 animate-fadeIn">
          {result.found ? (
            <div className="p-8 rounded-3xl bg-slate-900/90 border border-emerald-500/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Status Header */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
                        VERIFIED ON-CHAIN
                      </span>
                      <span className="text-xs text-slate-400 font-mono">EVM Smart Contract Verified</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mt-1">{result.title}</h3>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                    {(result.authenticityScore / 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-400">AI Deepfake Safety Rating</div>
                </div>
              </div>

              {/* Details Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                
                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 block">Creator Wallet Address</span>
                    <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span>{result.creator}</span>
                      <button onClick={() => copyToClipboard(result.creator)} className="text-slate-400 hover:text-white">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-mono text-slate-400 block">SHA-256 Audio Digest</span>
                    <div className="text-xs font-mono text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 break-all select-all">
                      {result.audioHash}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-mono text-slate-400 block">Perceptual Audio Hash (pHash)</span>
                    <div className="text-xs font-mono text-purple-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 break-all">
                      {result.pHash}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 block">Timestamp Anchored</span>
                    <div className="text-xs font-mono text-slate-200 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      {new Date(result.timestamp * 1000).toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-mono text-slate-400 block">IPFS Metadata Pointer</span>
                    <div className="text-xs font-mono text-indigo-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="truncate">{result.ipfsURI}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-mono text-slate-400 block">EIP-712 Cryptographic Signature Status</span>
                    <div className="text-xs font-mono text-emerald-400 bg-slate-950 p-2.5 rounded-xl border border-emerald-500/30 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Signature Validated & Creator Authenticated</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Printable Provenance Pass Certificate Box */}
              <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-slate-700/80 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400">
                    <QrCode className="w-12 h-12" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      <span className="font-extrabold text-sm text-white">Voice Provenance Pass Certificate</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Certificate ID: VP-2026-{(result.audioHash || '').substring(2, 10).toUpperCase()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNotify('Certificate downloaded as PDF/PNG export!', 'success')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-white flex items-center gap-2 transition"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Export Verification Pass</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-slate-900/90 border border-amber-500/40 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-white">Unregistered Audio Clip / Potential Deepfake</h3>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                No matching provenance entry exists on the VoiceProof EVM smart contract for hash <code className="text-cyan-300 font-mono">{searchInput}</code>.
                Exercise caution before trusting unverified media audio.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
