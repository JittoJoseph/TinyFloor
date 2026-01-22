import * as Phaser from "phaser";
import { WebSocketManager } from "./WebSocketManager";

interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

interface CallState {
  peerId: string;
  peerName: string;
  callType: "audio" | "video";
  status: "connecting" | "connected" | "reconnecting";
  startTime: number;
}

export class CallManager {
  private scene: Phaser.Scene;
  private wsManager: WebSocketManager;
  private playerId: string;
  private activeCalls: Map<string, CallState> = new Map();
  private currentIncomingCall: {
    from: string;
    fromName: string;
    callType: "audio" | "video";
  } | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private remoteStreams: Map<string, MediaStream> = new Map();
  private micEnabled: boolean = true;
  private videoEnabled: boolean = true;
  private peerNames: Map<string, string> = new Map(); // Store peer names for video elements

  // ICE servers for WebRTC connectivity
  private iceServers: ICEServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

  constructor(
    scene: Phaser.Scene,
    wsManager: WebSocketManager,
    playerId: string,
  ) {
    this.scene = scene;
    this.wsManager = wsManager;
    this.playerId = playerId;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for control bar events
    window.addEventListener("micToggle", ((e: CustomEvent) => {
      this.toggleMicrophone(e.detail.enabled);
    }) as EventListener);

    window.addEventListener("videoToggle", ((e: CustomEvent) => {
      this.toggleVideo(e.detail.enabled);
    }) as EventListener);

    window.addEventListener("leaveCall", (() => {
      this.endAllCalls();
    }) as EventListener);

    window.addEventListener("acceptCall", (() => {
      this.acceptCall();
    }) as EventListener);

    window.addEventListener("declineCall", (() => {
      this.declineCall();
    }) as EventListener);
  }

  async initiateCall(
    toId: string,
    callType: "audio" | "video",
    peerName?: string,
  ) {
    try {
      // Request media permissions first
      this.localStream = await this.getLocalStream(callType);

      // Store peer name
      this.peerNames.set(toId, peerName || "Unknown User");

      if (this.wsManager) {
        this.wsManager.send("request_call", {
          from: this.playerId,
          to: toId,
          callType,
        });
      }

      // Notify UI that call is starting
      window.dispatchEvent(new CustomEvent("callStarted"));
    } catch (error) {
      console.error("Failed to initiate call:", error);
      window.dispatchEvent(
        new CustomEvent("callError", {
          detail: { error: "Failed to access media devices" },
        }),
      );
    }
  }

  private async getLocalStream(
    callType: "audio" | "video",
  ): Promise<MediaStream> {
    // If we already have a stream with the right tracks, reuse it
    if (this.localStream) {
      const hasVideo = this.localStream.getVideoTracks().length > 0;
      if (
        (callType === "audio" && !hasVideo) ||
        (callType === "video" && hasVideo)
      ) {
        // Ensure tracks match current state
        this.localStream
          .getAudioTracks()
          .forEach((track) => (track.enabled = this.micEnabled));
        if (callType === "video") {
          this.localStream
            .getVideoTracks()
            .forEach((track) => (track.enabled = this.videoEnabled));
        }
        return this.localStream;
      }
      // Need to upgrade to video or downgrade to audio - stop existing stream
      this.localStream.getTracks().forEach((track) => track.stop());
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        "Media devices not supported. If you are on a local network, you must enable 'Insecure origins treated as secure' in chrome://flags.",
      );
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video:
        callType === "video"
          ? {
              width: { ideal: 320 },
              height: { ideal: 240 },
              facingMode: "user",
            }
          : false,
    });

    // Apply current mute/video state
    stream
      .getAudioTracks()
      .forEach((track) => (track.enabled = this.micEnabled));
    if (callType === "video") {
      stream
        .getVideoTracks()
        .forEach((track) => (track.enabled = this.videoEnabled));
    }

    return stream;
  }

  initiateChat() {
    // Dispatch event to open chat panel
    window.dispatchEvent(new CustomEvent("openChat"));
  }

  handleIncomingCall(data: Record<string, unknown>) {
    const { from, fromName, callType } = data as {
      from: string;
      fromName: string;
      callType: "audio" | "video";
    };
    this.currentIncomingCall = { from, fromName, callType };

    // Dispatch event for React UI
    window.dispatchEvent(
      new CustomEvent("incomingCall", {
        detail: { from, fromName, callType },
      }),
    );

    // Auto decline after 30 seconds
    this.scene.time.delayedCall(30000, () => {
      if (this.currentIncomingCall) {
        this.declineCall();
      }
    });
  }

  private async acceptCall() {
    if (!this.currentIncomingCall) return;

    const { from, fromName, callType } = this.currentIncomingCall;

    try {
      this.localStream = await this.getLocalStream(callType);

      const pc = this.createPeerConnection(from);
      this.peerConnections.set(from, pc);

      // Add local tracks
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (this.wsManager) {
        this.wsManager.send("webrtc_signal", {
          from: this.playerId,
          to: from,
          data: { type: "offer", sdp: offer.sdp },
        });

        this.wsManager.send("call_response", {
          from,
          to: this.playerId,
          accepted: true,
        });
      }

      this.hideIncomingCallModal();

      this.activeCalls.set(from, {
        peerId: from,
        peerName: fromName,
        callType,
        status: "connecting",
        startTime: Date.now(),
      });

      // Also store in peerNames for video elements
      this.peerNames.set(from, fromName);

      window.dispatchEvent(new CustomEvent("callStarted"));
    } catch (error) {
      console.error("Error accepting call:", error);
      window.dispatchEvent(
        new CustomEvent("callError", {
          detail: { error: "Failed to accept call" },
        }),
      );
      this.declineCall();
    }
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && this.wsManager) {
        this.wsManager.send("webrtc_signal", {
          from: this.playerId,
          to: peerId,
          data: { type: "candidate", candidate: event.candidate.toJSON() },
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      const callState = this.activeCalls.get(peerId);
      if (callState) {
        switch (pc.iceConnectionState) {
          case "connected":
          case "completed":
            callState.status = "connected";
            break;
          case "disconnected":
            callState.status = "reconnecting";
            break;
          case "failed":
          case "closed":
            this.endCall(peerId, "connection_lost");
            break;
        }
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        this.remoteStreams.set(peerId, stream);
        this.createVideoElement(peerId, stream);
      }
    };

    return pc;
  }

  private createVideoElement(peerId: string, stream: MediaStream) {
    // Get peer name from stored names
    const peerName = this.peerNames.get(peerId) || "Unknown User";

    // Dispatch event for React UI
    window.dispatchEvent(
      new CustomEvent("remoteStreamAdded", {
        detail: { peerId, stream, peerName },
      }),
    );
  }

  private declineCall() {
    if (this.currentIncomingCall) {
      if (this.wsManager) {
        this.wsManager.send("call_response", {
          from: this.currentIncomingCall.from,
          to: this.playerId,
          accepted: false,
        });
      }
      this.hideIncomingCallModal();
    }
  }

  private hideIncomingCallModal() {
    this.currentIncomingCall = null;
    window.dispatchEvent(new CustomEvent("incomingCallEnded"));
  }

  handleCallResponse(data: Record<string, unknown>) {
    const { from, accepted } = data as { from: string; accepted: boolean };

    if (accepted) {
      // Call was accepted, wait for WebRTC offer from the other peer
    } else {
      // Call was declined
      this.cleanupCall(from);
    }
  }

  async handleWebRTCSignal(data: Record<string, unknown>) {
    const { from, data: signalData } = data as {
      from: string;
      data: { type: string; sdp?: string; candidate?: RTCIceCandidateInit };
    };

    try {
      if (signalData.type === "offer") {
        // Received an offer, create answer
        let pc = this.peerConnections.get(from);
        if (!pc) {
          pc = this.createPeerConnection(from);
          this.peerConnections.set(from, pc);

          // Add local tracks if we have them
          if (this.localStream) {
            this.localStream.getTracks().forEach((track) => {
              pc!.addTrack(track, this.localStream!);
            });
          }
        }

        await pc.setRemoteDescription(
          new RTCSessionDescription({
            type: "offer",
            sdp: signalData.sdp,
          }),
        );

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (this.wsManager) {
          this.wsManager.send("webrtc_signal", {
            from: this.playerId,
            to: from,
            data: { type: "answer", sdp: answer.sdp },
          });
        }
      } else if (signalData.type === "answer") {
        const pc = this.peerConnections.get(from);
        if (pc) {
          await pc.setRemoteDescription(
            new RTCSessionDescription({
              type: "answer",
              sdp: signalData.sdp,
            }),
          );
        }
      } else if (signalData.type === "candidate" && signalData.candidate) {
        const pc = this.peerConnections.get(from);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        }
      }
    } catch (error) {
      console.error("Error handling WebRTC signal:", error);
    }
  }

  handleCallEnded(data: Record<string, unknown>) {
    const { from } = data as { from: string };
    this.cleanupCall(from);
  }

  private cleanupCall(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }

    this.activeCalls.delete(peerId);
    this.remoteStreams.delete(peerId);

    // Dispatch event for React UI
    window.dispatchEvent(
      new CustomEvent("remoteStreamRemoved", { detail: { peerId } }),
    );

    // If no more calls, stop local stream and notify UI
    if (this.activeCalls.size === 0) {
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop());
        this.localStream = null;
      }
      window.dispatchEvent(new CustomEvent("callEnded"));
    }
  }

  endCall(toId: string, reason: string) {
    if (this.wsManager) {
      this.wsManager.send("call_ended", {
        from: this.playerId,
        to: toId,
        reason,
      });
    }
    this.cleanupCall(toId);
  }

  private endAllCalls() {
    const callIds = Array.from(this.activeCalls.keys());
    callIds.forEach((id) => this.endCall(id, "user_hangup"));
  }

  toggleMicrophone(enabled: boolean) {
    this.micEnabled = enabled;
    if (this.localStream) {
      if (enabled) {
        // If enabling mic and we don't have audio tracks, get them
        if (this.localStream.getAudioTracks().length === 0) {
          this.initializeAudioTracks();
        } else {
          // Enable existing tracks
          this.localStream.getAudioTracks().forEach((track) => {
            track.enabled = true;
          });
        }
      } else {
        // Disable audio tracks
        this.localStream.getAudioTracks().forEach((track) => {
          track.enabled = false;
          // Stop the track
          track.stop();
        });
        // Remove stopped tracks from stream
        const videoTracks = this.localStream.getVideoTracks();
        const newStream = new MediaStream(videoTracks);
        this.localStream = newStream;
      }
    } else if (enabled) {
      // Initialize audio even without an active call
      this.initializeAudioTracks();
    }
  }

  toggleVideo(enabled: boolean) {
    this.videoEnabled = enabled;
    if (this.localStream) {
      if (enabled) {
        // If enabling video and we don't have video tracks, get them
        if (this.localStream.getVideoTracks().length === 0) {
          this.initializeVideoTracks();
        } else {
          // Enable existing tracks
          this.localStream.getVideoTracks().forEach((track) => {
            track.enabled = true;
          });
        }
      } else {
        // Disable video tracks (don't stop them permanently)
        this.localStream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
    } else if (enabled) {
      // Initialize video even without an active call
      this.initializeVideoTracks();
    }
  }

  private async initializeVideoTracks() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("Media devices not supported");
        return;
      }

      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: "user",
        },
      });

      if (this.localStream) {
        // Add video tracks to existing stream
        videoStream.getVideoTracks().forEach((track) => {
          this.localStream!.addTrack(track);
        });
      } else {
        // Create new stream with video
        this.localStream = videoStream;
        // Add audio if mic is enabled
        if (this.micEnabled) {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          audioStream.getAudioTracks().forEach((track) => {
            this.localStream!.addTrack(track);
          });
        }
      }

      // Apply current state
      this.localStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = this.micEnabled));
      this.localStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = this.videoEnabled));
    } catch (error) {
      console.error("Failed to initialize video tracks:", error);
    }
  }

  private async initializeAudioTracks() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("Media devices not supported");
        return;
      }

      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (this.localStream) {
        // Add audio tracks to existing stream
        audioStream.getAudioTracks().forEach((track) => {
          this.localStream!.addTrack(track);
        });
      } else {
        // Create new stream with audio
        this.localStream = audioStream;
        // Add video if video is enabled
        if (this.videoEnabled) {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 320 },
              height: { ideal: 240 },
              facingMode: "user",
            },
          });
          videoStream.getVideoTracks().forEach((track) => {
            this.localStream!.addTrack(track);
          });
        }
      }

      // Apply current state
      this.localStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = this.micEnabled));
      this.localStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = this.videoEnabled));
    } catch (error) {
      console.error("Failed to initialize audio tracks:", error);
    }
  }
  isInCall(): boolean {
    return this.activeCalls.size > 0;
  }

  getActiveCalls(): CallState[] {
    return Array.from(this.activeCalls.values());
  }

  cleanup() {
    this.endAllCalls();
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    this.activeCalls.clear();
    this.remoteStreams.clear();
  }
}
