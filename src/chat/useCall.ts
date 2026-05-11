/**
 * useCall — P2P WebRTC hook for 1:1 audio/video calls.
 *
 * Manages RTCPeerConnection lifecycle, ICE candidates, and WS signaling.
 * Audio + optional video + optional screen share.
 */
import { useRef, useState, useCallback, useEffect } from "react";
import { useChatContext, type CallSignalEvent } from "./ChatContext";
import { useCallConfig } from "./useChatApi";
import { MsgType } from "./types";

export type CallState = "idle" | "ringing_out" | "ringing_in" | "connecting" | "connected";

export interface UseCallReturn {
  state: CallState;
  /** Start an outgoing call */
  call: (peerId: string, hasVideo: boolean) => void;
  /** Accept an incoming call */
  accept: () => void;
  /** Reject an incoming call */
  reject: () => void;
  /** Hang up an active call */
  hangup: () => void;
  /** Toggle mute */
  toggleMute: () => void;
  /** Toggle camera */
  toggleCamera: () => void;
  /** Toggle screen share */
  toggleScreen: () => void;

  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  callId: string | null;
  peerId: string | null;
  hasVideo: boolean;
  /** Whether the remote peer is sending video (camera or screen share) */
  remoteHasVideo: boolean;
  /** Duration in seconds since connected */
  duration: number;
  /** Remote audio/video element ref */
  remoteRef: React.RefObject<HTMLVideoElement | null>;
  /** Local video element ref */
  localRef: React.RefObject<HTMLVideoElement | null>;
}

export function useCall(): UseCallReturn {
  const { ws, peerCall, clearPeerCall, updatePeerCallState, lastCallSignal } = useChatContext();
  const { data: callConfig } = useCallConfig();

  const [state, setState] = useState<CallState>("idle");
  const [callId, setCallId] = useState<string | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const [duration, setDuration] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remoteRef = useRef<HTMLVideoElement | null>(null);
  const localRef = useRef<HTMLVideoElement | null>(null);
  const iceCandidateBuffer = useRef<RTCIceCandidate[]>([]);
  const durationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const callIdRef = useRef<string | null>(null);
  const peerIdRef = useRef<string | null>(null);
  const makingOffer = useRef(false);

  // ── Cleanup ──
  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    iceCandidateBuffer.current = [];
    if (durationTimer.current) clearInterval(durationTimer.current);
    durationTimer.current = null;
    startedAtRef.current = 0;

    setState("idle");
    setCallId(null);
    setPeerId(null);
    callIdRef.current = null;
    peerIdRef.current = null;
    setHasVideo(false);
    setIsMuted(false);
    setIsCameraOn(false);
    setIsScreenSharing(false);
    setRemoteHasVideo(false);
    setDuration(0);
    clearPeerCall();
  }, [clearPeerCall]);

  // ── Create PeerConnection ──
  const createPC = useCallback(() => {
    const iceServers = callConfig?.iceServers?.map((s) => ({
      urls: s.urls,
      username: s.username,
      credential: s.credential,
    })) ?? [{ urls: "stun:stun.l.google.com:19302" }];

    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    pc.onicecandidate = (ev) => {
      if (ev.candidate && callIdRef.current && peerIdRef.current && ws) {
        ws.sendCallICE(callIdRef.current, peerIdRef.current, JSON.stringify(ev.candidate.toJSON()));
      }
    };

    pc.onnegotiationneeded = async () => {
      const cid = callIdRef.current;
      const pid = peerIdRef.current;
      if (!cid || !pid || !ws || makingOffer.current) return;
      // Only renegotiate once connected (skip initial offer)
      if (pc.connectionState !== "connected") return;
      try {
        makingOffer.current = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.sendCallOffer(cid, pid, JSON.stringify(pc.localDescription));
      } catch {
        // renegotiation failed
      } finally {
        makingOffer.current = false;
      }
    };

    pc.ontrack = (ev) => {
      if (remoteRef.current) {
        // Always add tracks to a single combined MediaStream
        // so screen share video doesn't replace mic audio
        let existing = remoteRef.current.srcObject as MediaStream | null;
        if (!existing) {
          existing = new MediaStream();
          remoteRef.current.srcObject = existing;
        }
        // Remove existing tracks of same kind if this is a replacement
        // (e.g. camera → screen share both send video)
        if (ev.track.kind === "video") {
          existing.getVideoTracks().forEach((t) => existing!.removeTrack(t));
        }
        existing.addTrack(ev.track);
      }
      if (ev.track.kind === "video") {
        setRemoteHasVideo(true);
        ev.track.onended = () => setRemoteHasVideo(false);
        ev.track.onmute = () => setRemoteHasVideo(false);
        ev.track.onunmute = () => setRemoteHasVideo(true);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setState("connected");
        startedAtRef.current = Date.now();
        durationTimer.current = setInterval(() => {
          setDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
        }, 1000);
      }
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        if (callIdRef.current && peerIdRef.current && ws) ws.sendCallEnd(callIdRef.current, peerIdRef.current);
        cleanup();
      }
    };

    return pc;
  }, [callConfig, ws, cleanup]);

  // ── Get local media ──
  const getLocalStream = useCallback(async (video: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    });
    localStreamRef.current = stream;
    if (localRef.current) localRef.current.srcObject = stream;
    return stream;
  }, []);

  // ── Start outgoing call ──
  const call = useCallback(
    async (targetPeerId: string, withVideo: boolean) => {
      if (state !== "idle" || !ws) return;
      const cid = crypto.randomUUID();
      setCallId(cid);
      setPeerId(targetPeerId);
      callIdRef.current = cid;
      peerIdRef.current = targetPeerId;
      setHasVideo(withVideo);
      setIsCameraOn(withVideo);
      setState("ringing_out");

      ws.sendCallRing(cid, targetPeerId, withVideo);
    },
    [state, ws]
  );

  // ── Accept incoming call ──
  const accept = useCallback(async () => {
    if (!peerCall || !ws) return;
    const cid = peerCall.callId;
    const pid = peerCall.peerId;
    const vid = peerCall.hasVideo;

    setCallId(cid);
    setPeerId(pid);
    callIdRef.current = cid;
    peerIdRef.current = pid;
    setHasVideo(vid);
    setIsCameraOn(vid);
    setState("connecting");
    updatePeerCallState("connected");

    ws.sendCallAccept(cid, pid);

    try {
      // Get media & create PC
      const stream = await getLocalStream(vid);
      const pc = createPC();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // Flush buffered ICE candidates
      for (const c of iceCandidateBuffer.current) {
        pc.addIceCandidate(c).catch(() => {});
      }
      iceCandidateBuffer.current = [];
    } catch {
      ws.sendCallEnd(cid, pid);
      cleanup();
    }
  }, [peerCall, ws, getLocalStream, createPC, cleanup]);

  // ── Reject incoming call ──
  const reject = useCallback(() => {
    if (!peerCall || !ws) return;
    ws.sendCallReject(peerCall.callId, peerCall.peerId);
    cleanup();
  }, [peerCall, ws, cleanup]);

  // ── Hang up ──
  const hangup = useCallback(() => {
    if (callId && peerId && ws) {
      ws.sendCallEnd(callId, peerId);
    }
    cleanup();
  }, [callId, peerId, ws, cleanup]);

  // ── Toggle mute ──
  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  }, []);

  // ── Toggle camera ──
  const toggleCamera = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;

    if (isCameraOn) {
      // Turn off camera
      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        const sender = pc.getSenders().find((s) => s.track === videoTrack);
        if (sender) pc.removeTrack(sender);
      }
      setIsCameraOn(false);
    } else {
      // Turn on camera
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      const videoTrack = videoStream.getVideoTracks()[0];
      localStreamRef.current?.addTrack(videoTrack);
      pc.addTrack(videoTrack, localStreamRef.current!);
      // Only update PiP if not screen sharing (screen share takes priority)
      if (localRef.current && !screenStreamRef.current) localRef.current.srcObject = localStreamRef.current;
      setIsCameraOn(true);
    }
  }, [isCameraOn]);

  // ── Toggle screen share ──
  const toggleScreen = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;

    if (isScreenSharing) {
      // Stop screen share
      screenStreamRef.current?.getTracks().forEach((t) => {
        t.stop();
        const sender = pc.getSenders().find((s) => s.track === t);
        if (sender) pc.removeTrack(sender);
      });
      screenStreamRef.current = null;
      setIsScreenSharing(false);
      // Restore camera preview if camera is still on
      if (localRef.current) {
        localRef.current.srcObject = localStreamRef.current?.getVideoTracks().length ? localStreamRef.current : null;
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        screenStreamRef.current = screenStream;
        screenStream.getTracks().forEach((t) => {
          pc.addTrack(t, screenStream);
          t.onended = () => {
            const sender = pc.getSenders().find((s) => s.track === t);
            if (sender) pc.removeTrack(sender);
            screenStreamRef.current = null;
            setIsScreenSharing(false);
            // Restore camera preview if camera is still on
            if (localRef.current) {
              localRef.current.srcObject = localStreamRef.current?.getVideoTracks().length ? localStreamRef.current : null;
            }
          };
        });
        setIsScreenSharing(true);
        // Show screen share preview in local PiP
        if (localRef.current) localRef.current.srcObject = screenStream;
      } catch {
        // User cancelled screen share picker
      }
    }
  }, [isScreenSharing]);

  // ── Handle incoming call signals for WebRTC negotiation ──
  useEffect(() => {
    if (!lastCallSignal || !ws) return;
    const sig = lastCallSignal;

    const handleSignal = async (sig: CallSignalEvent) => {
      // Only process signals for our active call
      if (sig.callId !== callIdRef.current && state !== "ringing_out") return;

      switch (sig.type) {
        case MsgType.CALL_ACCEPT: {
          // Our outgoing call was accepted — create offer
          if (state !== "ringing_out") return;
          setState("connecting");

          try {
            const stream = await getLocalStream(hasVideo);
            const pc = createPC();
            stream.getTracks().forEach((t) => pc.addTrack(t, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.sendCallOffer(callIdRef.current!, peerIdRef.current!, JSON.stringify(offer));
          } catch {
            if (callIdRef.current && peerIdRef.current) ws.sendCallEnd(callIdRef.current, peerIdRef.current);
            cleanup();
          }
          break;
        }

        case MsgType.CALL_OFFER: {
          // Callee received offer — create answer
          const pc = pcRef.current;
          if (!pc || !sig.sdp) return;
          const offer = JSON.parse(sig.sdp) as RTCSessionDescriptionInit;
          await pc.setRemoteDescription(new RTCSessionDescription(offer));

          // Flush buffered ICE
          for (const c of iceCandidateBuffer.current) {
            pc.addIceCandidate(c).catch(() => {});
          }
          iceCandidateBuffer.current = [];

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.sendCallAnswer(sig.callId, sig.from, JSON.stringify(answer));
          break;
        }

        case MsgType.CALL_ANSWER: {
          // Caller received answer
          const pc = pcRef.current;
          if (!pc || !sig.sdp) return;
          const answer = JSON.parse(sig.sdp) as RTCSessionDescriptionInit;
          await pc.setRemoteDescription(new RTCSessionDescription(answer));

          // Flush buffered ICE
          for (const c of iceCandidateBuffer.current) {
            pc.addIceCandidate(c).catch(() => {});
          }
          iceCandidateBuffer.current = [];
          break;
        }

        case MsgType.CALL_ICE: {
          const pc = pcRef.current;
          if (!sig.ice) return;
          const candidate = new RTCIceCandidate(JSON.parse(sig.ice) as RTCIceCandidateInit);
          if (pc?.remoteDescription) {
            pc.addIceCandidate(candidate).catch(() => {});
          } else {
            iceCandidateBuffer.current.push(candidate);
          }
          break;
        }

        case MsgType.CALL_END:
        case MsgType.CALL_REJECT:
        case MsgType.CALL_BUSY:
        case MsgType.CALL_MISSED:
          cleanup();
          break;
      }
    };

    handleSignal(sig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastCallSignal]);

  // ── Sync state from context peerCall (for incoming calls) ──
  useEffect(() => {
    if (peerCall?.state === "ringing_in" && state === "idle") {
      setState("ringing_in");
      setCallId(peerCall.callId);
      setPeerId(peerCall.peerId);
      setHasVideo(peerCall.hasVideo);
    }
    if (!peerCall && state === "ringing_in") {
      // Call was ended from context (busy/missed/reject) while ringing in
      cleanup();
    }
  }, [peerCall, state, cleanup]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (durationTimer.current) clearInterval(durationTimer.current);
    };
  }, []);

  return {
    state,
    call,
    accept,
    reject,
    hangup,
    toggleMute,
    toggleCamera,
    toggleScreen,
    isMuted,
    isCameraOn,
    isScreenSharing,
    callId,
    peerId,
    hasVideo,
    remoteHasVideo,
    duration,
    remoteRef,
    localRef,
  };
}
