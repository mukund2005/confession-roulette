import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import type { MediaConnection } from 'peerjs';

interface UseWebRTCBreakoutProps {
  myId: string | null;
  partnerId: string | null;
  isActive: boolean; // True during the 30s call, false during intermission
}

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

  // Initialize or maintain Peer instance
  useEffect(() => {
    if (!myId) return;

    if (!peerRef.current || peerRef.current.disconnected || peerRef.current.destroyed) {
      const peer = new Peer(myId, {
        debug: 1,
      });

      peer.on('open', () => {
        setCallError(null);
      });

      peer.on('error', (err) => {
        console.warn('PeerJS error:', err);
        // ID taken or network glitch: PeerJS continues or reconnects
      });

      peerRef.current = peer;
    }

    return () => {
      // Clean up peer when unmounting hook
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

    const setupCall = async () => {
      if (!isActive || !myId || !partnerId) {
        // Intermission or inactive: close active call
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
          monitorStream(remoteStream, false);
          setIsConnected(true);
        };

        // 2. Deterministic Caller / Answerer Negotiation
        // If myId < partnerId -> Initiate Call
        // If myId > partnerId -> Listen for Call and Answer
        if (myId < partnerId) {
          // Delay briefly to allow answerer listener to be ready
          setTimeout(() => {
            if (isCancelled || !isActive) return;
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
          }, 600);
        } else {
          // Answerer
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
        }
      } catch (err: any) {
        console.error('WebRTC setup error:', err);
        setCallError(err.message || 'Microphone error during call setup');
      }
    };

    setupCall();

    return () => {
      isCancelled = true;
      if (currentCallRef.current) {
        currentCallRef.current.close();
        currentCallRef.current = null;
      }
      setIsConnected(false);
      setRemoteVolume(0);
    };
  }, [isActive, myId, partnerId, monitorStream]);

  // Teardown all streams when completely unmounted
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
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
