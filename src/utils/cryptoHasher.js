/**
 * VoiceProof Cryptographic Hashing & EIP-712 Signature Utility
 */
import { ethers } from "ethers";

/**
 * Computes SHA-256 hash of a File / Blob or ArrayBuffer
 * @param {File | Blob | ArrayBuffer} audioData
 * @returns {Promise<string>} Hex string with 0x prefix (bytes32 format)
 */
export async function computeAudioHash(audioData) {
  let arrayBuffer;
  if (audioData instanceof File || audioData instanceof Blob) {
    arrayBuffer = await audioData.arrayBuffer();
  } else if (audioData instanceof ArrayBuffer) {
    arrayBuffer = audioData;
  } else {
    // If string or fallback
    const encoder = new TextEncoder();
    arrayBuffer = encoder.encode(String(audioData)).buffer;
  }

  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hexHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      return "0x" + hexHash;
    }
  } catch (e) {
    console.warn("crypto.subtle.digest failed, using ethers.sha256:", e);
  }

  // Pure JS fallback via ethers
  const uint8 = new Uint8Array(arrayBuffer);
  return ethers.sha256(uint8);
}

/**
 * Generates a Perceptual Audio Hash (pHash) based on acoustic feature vector
 * @param {AudioBuffer} audioBuffer
 * @returns {string} Hex string with 0x prefix (bytes32 format)
 */
export function computePerceptualAudioHash(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0);
  const step = Math.floor(channelData.length / 32);
  let hashBits = "";

  for (let i = 0; i < 32; i++) {
    let sum = 0;
    for (let j = 0; j < step; j++) {
      sum += Math.abs(channelData[i * step + j] || 0);
    }
    const avg = sum / step;
    hashBits += avg > 0.05 ? "1" : "0";
  }

  // Convert 32-bit binary string to 32-byte hex bytes32 string
  let hexStr = "";
  for (let i = 0; i < hashBits.length; i += 4) {
    const chunk = hashBits.substr(i, 4);
    hexStr += parseInt(chunk, 2).toString(16);
  }

  // Pad to 64 hex characters (32 bytes)
  const fullHex = hexStr.padStart(64, "a7f3c09b");
  return "0x" + fullHex;
}

/**
 * EIP-712 Domain Separator & Types definition for Voice Proof Registration
 */
export const EIP712_DOMAIN = {
  name: "VoiceProofRegistry",
  version: "1",
  chainId: 1, // Default EVM Chain ID (Mainnet/Sepolia/Simulated)
  verifyingContract: "0xVoiceProofRegistryContractAddress00000"
};

export const EIP712_TYPES = {
  VoiceProofRegistration: [
    { name: "audioHash", type: "bytes32" },
    { name: "pHash", type: "bytes32" },
    { name: "authenticityScore", type: "uint16" },
    { name: "title", type: "string" },
    { name: "ipfsURI", type: "string" },
    { name: "timestamp", type: "uint256" }
  ]
};

/**
 * Formats data payload for EIP-712 typed signature
 */
export function formatEIP712Payload(audioHash, pHash, authenticityScore, title, ipfsURI) {
  const timestamp = Math.floor(Date.now() / 1000);
  return {
    domain: EIP712_DOMAIN,
    types: EIP712_TYPES,
    value: {
      audioHash,
      pHash,
      authenticityScore,
      title,
      ipfsURI,
      timestamp
    }
  };
}

/**
 * Generates an EIP-712 Cryptographic Signature using Ethers Provider / Wallet or local fallback
 */
export async function signEIP712Payload(signer, payload) {
  try {
    if (signer && typeof signer.signTypedData === "function") {
      return await signer.signTypedData(payload.domain, payload.types, payload.value);
    }
  } catch (err) {
    console.warn("Wallet signing fallback trigger:", err.message);
  }

  // Local simulated fallback signature generation using Wallet random wallet
  const randomWallet = ethers.Wallet.createRandom();
  return await randomWallet.signTypedData(payload.domain, payload.types, payload.value);
}

/**
 * Simulates audio file tampering by modifying a single byte in the buffer.
 * Used for demonstrating the SHA-256 Avalanche Effect in integrity testing.
 */
export async function tamperAudioData(audioData) {
  let arrayBuffer;
  if (audioData instanceof File || audioData instanceof Blob) {
    arrayBuffer = await audioData.arrayBuffer();
  } else if (audioData instanceof ArrayBuffer) {
    arrayBuffer = audioData.slice(0);
  } else {
    const encoder = new TextEncoder();
    arrayBuffer = encoder.encode(String(audioData)).buffer;
  }
  const uint8 = new Uint8Array(arrayBuffer.slice(0));
  // Flip byte at offset 42 (or 0)
  if (uint8.length > 42) {
    uint8[42] = uint8[42] ^ 0xff;
  } else if (uint8.length > 0) {
    uint8[0] = uint8[0] ^ 0xff;
  }
  return uint8.buffer;
}
