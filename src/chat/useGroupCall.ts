import { useState, useCallback, useRef, useEffect } from "react";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type LocalParticipant,
  type RemoteTrackPublication,
  type RemoteTrack,
} from "livekit-client";
import { useCallConfig, useStartGroupCall, useJoinGroupCall, useLeaveGroupCall, useEndGroupCall } from "./useChatApi";

export interface Participant {
  sid: string;
  identity: string;
  name: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  isLocal: boolean;
}

export type GroupCallState = "idle" | "joining" | "connected" | "error";

export function useGroupCall(roomId: string) {
  const lkRoomRef = useRef<Room | null>(null);
  const [state, setState] = useState<GroupCallState>("idle");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenShareTrack, setScreenShareTrack] = useState<MediaStreamTrack | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // "starting" | "leaving" | "ending"

  const { data: callConfig } = useCallConfig();
  const startCall = useStartGroupCall();
  const joinCall = useJoinGroupCall();
  const leaveCall = useLeaveGroupCall();
  const endCall = useEndGroupCall();

  // Build participant list from LiveKit room
  const syncParticipants = useCallback(() => {
    const lkRoom = lkRoomRef.current;
    if (!lkRoom) return;

    const list: Participant[] = [];

    const mapParticipant = (
      p: LocalParticipant | RemoteParticipant,
      isLocal: boolean
    ): Participant => {
      let muted = true;
      let sharing = false;

      for (const pub of p.trackPublications.values()) {
        if (pub.source === Track.Source.Microphone && pub.track && !pub.isMuted) {
          muted = false;
        }
        if (pub.source === Track.Source.ScreenShare && pub.track) {
          sharing = true;
        }
      }

      return {
        sid: p.sid,
        identity: p.identity,
        name: p.name || p.identity,
        isMuted: muted,
        isSpeaking: p.isSpeaking,
        isScreenSharing: sharing,
        isLocal,
      };
    };

    list.push(mapParticipant(lkRoom.localParticipant, true));
    for (const p of lkRoom.remoteParticipants.values()) {
      list.push(mapParticipant(p, false));
    }

    setParticipants(list);
  }, []);

  // Connect to LiveKit room with a token
  const connectToRoom = useCallback(
    async (token: string) => {
      const livekitUrl = callConfig?.livekit?.url;
      if (!livekitUrl) {
        setError("LiveKit not configured");
        setState("error");
        return;
      }

      setState("joining");

      try {
        const lkRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        lkRoomRef.current = lkRoom;

        // Attach remote audio tracks to DOM so they actually play
        const audioContainer = document.createElement("div");
        audioContainer.id = "lk-audio";
        audioContainer.style.display = "none";
        document.body.appendChild(audioContainer);

        lkRoom.on(
          RoomEvent.TrackSubscribed,
          (track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
            if (track.kind === Track.Kind.Audio) {
              const el = track.attach();
              el.dataset.participantSid = participant.sid;
              audioContainer.appendChild(el);
            }
            syncParticipants();
          }
        );

        lkRoom.on(
          RoomEvent.TrackUnsubscribed,
          (track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
            track.detach().forEach((el) => el.remove());
            syncParticipants();
          }
        );

        // Wire up events
        lkRoom.on(RoomEvent.ParticipantConnected, syncParticipants);
        lkRoom.on(RoomEvent.ParticipantDisconnected, syncParticipants);
        lkRoom.on(RoomEvent.TrackMuted, syncParticipants);
        lkRoom.on(RoomEvent.TrackUnmuted, syncParticipants);
        lkRoom.on(RoomEvent.ActiveSpeakersChanged, syncParticipants);
        lkRoom.on(RoomEvent.LocalTrackPublished, syncParticipants);
        lkRoom.on(RoomEvent.LocalTrackUnpublished, syncParticipants);

        lkRoom.on(RoomEvent.Disconnected, () => {
          // Clean up audio elements
          audioContainer.remove();
          setState("idle");
          setParticipants([]);
          setIsMuted(false);
          setIsScreenSharing(false);
          setScreenShareTrack(null);
          lkRoomRef.current = null;
        });

        await lkRoom.connect(livekitUrl, token);
        await lkRoom.localParticipant.setMicrophoneEnabled(true);

        setState("connected");
        syncParticipants();
      } catch (e) {
        setError((e as Error).message);
        setState("error");
        lkRoomRef.current = null;
      }
    },
    [callConfig, syncParticipants]
  );

  // Start a new group call (auto-joins if one is already active)
  const start = useCallback(async () => {
    setActionLoading("starting");
    try {
      const res = await startCall.mutateAsync(roomId);
      await connectToRoom(res.token);
    } catch {
      // Call already active — fall back to join
      try {
        const res = await joinCall.mutateAsync(roomId);
        await connectToRoom(res.token);
      } catch (e2) {
        setError((e2 as Error).message);
        setState("error");
      }
    } finally {
      setActionLoading(null);
    }
  }, [roomId, startCall, joinCall, connectToRoom]);

  // Join an existing group call
  const join = useCallback(async () => {
    try {
      const res = await joinCall.mutateAsync(roomId);
      await connectToRoom(res.token);
    } catch (e) {
      setError((e as Error).message);
      setState("error");
    }
  }, [roomId, joinCall, connectToRoom]);

  // Leave the call (participant leaves)
  const leave = useCallback(async () => {
    setActionLoading("leaving");
    try {
      await leaveCall.mutateAsync(roomId);
    } catch {
      // server might already have removed us
    }
    lkRoomRef.current?.disconnect();
    setState("idle");
    setParticipants([]);
    setActionLoading(null);
  }, [roomId, leaveCall]);

  // End the call (admin only — ends for everyone)
  const end = useCallback(async () => {
    setActionLoading("ending");
    try {
      await endCall.mutateAsync(roomId);
    } catch {
      // ignore
    }
    lkRoomRef.current?.disconnect();
    setState("idle");
    setParticipants([]);
    setActionLoading(null);
  }, [roomId, endCall]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    const lkRoom = lkRoomRef.current;
    if (!lkRoom) return;
    const next = !isMuted;
    await lkRoom.localParticipant.setMicrophoneEnabled(!next);
    setIsMuted(next);
    syncParticipants();
  }, [isMuted, syncParticipants]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    const lkRoom = lkRoomRef.current;
    if (!lkRoom) return;

    if (isScreenSharing) {
      await lkRoom.localParticipant.setScreenShareEnabled(false);
      setIsScreenSharing(false);
      setScreenShareTrack(null);
    } else {
      await lkRoom.localParticipant.setScreenShareEnabled(true);
      // Find the screen share track
      for (const pub of lkRoom.localParticipant.trackPublications.values()) {
        if (pub.source === Track.Source.ScreenShare && pub.track) {
          setScreenShareTrack(pub.track.mediaStreamTrack);
          break;
        }
      }
      setIsScreenSharing(true);
    }
    syncParticipants();
  }, [isScreenSharing, syncParticipants]);

  // Get a remote screen share track (first one found)
  const getRemoteScreenTrack = useCallback((): MediaStreamTrack | null => {
    const lkRoom = lkRoomRef.current;
    if (!lkRoom) return null;
    for (const p of lkRoom.remoteParticipants.values()) {
      for (const pub of p.trackPublications.values()) {
        if (
          pub.source === Track.Source.ScreenShare &&
          pub.track &&
          pub.isSubscribed
        ) {
          return pub.track.mediaStreamTrack;
        }
      }
    }
    return null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      lkRoomRef.current?.disconnect();
    };
  }, []);

  return {
    state,
    participants,
    isMuted,
    isScreenSharing,
    screenShareTrack,
    error,
    actionLoading,
    start,
    join,
    leave,
    end,
    toggleMute,
    toggleScreenShare,
    getRemoteScreenTrack,
  };
}
