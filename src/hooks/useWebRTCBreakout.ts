import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import type { MediaConnection } from 'peerjs';

interface UseWebRTCBreakoutProps {
  myId: string | null;
  partnerId: string | null;
  isActive: boolean; // True during the 30s call, false during intermission
}

const PUBLIC_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

export function useWebRTCBreakout({ myId, partnerId, isActive }: UseWebRTCBreakoutProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [localVolume, setLocalVolume] = useState(0);
  const [remoteVolume, setRemoteVolume] = useState(0);
  const [callError, setCallError] = useState<string | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const currentCallRef = useRef<MediaConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize or maintain Peer instance with global Google STUN servers for internet NAT traversal
  useEffect(() => {
    if (!myId) return;

    if (!peerRef.current || peerRef.current.disconnected || peerRef.current.destroyed) {
      const peer = new Peer(myId, {
        debug: 1,
        config: {
          iceServers: PUBLIC_ICE_SERVERS,
        },
      });

      peer.on('open', () => {
        setCallError(null);
      });

      peer.on('disconnected', () => {
        try {
          peer.reconnect();
        } catch (e) {
          console.warn('Peer reconnect attempt:', e);
        }
      });

      peer.on('error', (err) => {
        console.warn('PeerJS cross-internet error:', err);
      });

      peerRef.current = peer;
    }

    return () => {
      // Keep peer alive across rounds
    };
  }, [myId]);

  // Audio level monitoring helper
  const monitorStream = useCallback((stream: MediaStream, isLocal: boolean) => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtxClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i];
        const avg = sum / buffer.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));

        if (isLocal) {
          setLocalVolume(normalized);
        } else {
          setRemoteVolume(normalized);
        }

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (e) {
      console.warn('Could not monitor stream volume:', e);
    }
  }, []);

  // Handle active round WebRTC negotiation
  useEffect(() => {
    let isCancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let initialTimer: ReturnType<typeof setTimeout> | null = null;

    const setupCall = async () => {
      if (!isActive || !myId || !partnerId) {
        if (currentCallRef.current) {
          currentCallRef.current.close();
          currentCallRef.current = null;
        }
        setIsConnected(false);
        setRemoteVolume(0);
        return;
      }

      try {
        // 1. Acquire local microphone stream if not already active
        if (!localStreamRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          if (isCancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          localStreamRef.current = stream;
          monitorStream(stream, true);
        }

        const localStream = localStreamRef.current;
        const peer = peerRef.current;
        if (!peer) return;

        const attachRemoteStream = (remoteStream: MediaStream) => {
          if (!remoteAudioRef.current) {
            const audio = new Audio();
            audio.autoplay = true;
            (audio as any).playsInline = true;
            remoteAudioRef.current = audio;
          }
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch(() => {});
          if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume().catch(() => {});
          }
          monitorStream(remoteStream, false);
          setIsConnected(true);
        };

        // Incoming call listener for answerer
        const handleIncoming = (incomingCall: MediaConnection) => {
          if (incomingCall.peer === partnerId) {
            currentCallRef.current = incomingCall;
            incomingCall.answer(localStream);

            incomingCall.on('stream', (remoteStream) => {
              attachRemoteStream(remoteStream);
            });

            incomingCall.on('close', () => {
              setIsConnected(false);
              setRemoteVolume(0);
            });
          }
        };

        peer.on('call', handleIncoming);

        // Deterministic Caller Initiation
        if (myId < partnerId) {
          const makeCall = () => {
            if (isCancelled || !isActive || isConnected) return;
            const call = peer.call(partnerId, localStream);
            currentCallRef.current = call;

            call.on('stream', (remoteStream) => {
              attachRemoteStream(remoteStream);
            });

            call.on('close', () => {
              setIsConnected(false);
              setRemoteVolume(0);
            });

            call.on('error', (err) => {
              console.warn('Call error:', err);
              setCallError(err.message);
            });
          };

          initialTimer = setTimeout(makeCall, 700);
          retryTimer = setTimeout(() => {
            if (!isConnected && isActive && !isCancelled) {
              makeCall();
            }
          }, 3200);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setCallError(err.message || 'Microphone access denied or audio error');
        }
      }
    };

    setupCall();

    return () => {
      isCancelled = true;
      if (initialTimer) clearTimeout(initialTimer);
      if (retryTimer) clearTimeout(retryTimer);
      if (currentCallRef.current) {
        currentCallRef.current.close();
        currentCallRef.current = null;
      }
      setIsConnected(false);
      setRemoteVolume(0);
    };
  }, [isActive, myId, partnerId, monitorStream]);

  // Clean up audio tracks on hook teardown
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    };
  }, []);

  return {
    isConnected,
    localVolume,
    remoteVolume,
    callError,
  };
}
