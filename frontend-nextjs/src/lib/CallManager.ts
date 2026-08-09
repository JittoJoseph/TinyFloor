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
  private activeCalls = new Map<string, CallState>();
  private currentIncomingCall: {
    from: string;
    fromName: string;
    callType: "audio" | "video";
  } | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private localStream: MediaStream | null = null;
  private remoteStreams = new Map<string, MediaStream>();
  private micEnabled = true;
  private videoEnabled = true;
  private peerNames = new Map<string, string>();
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
      this.localStream = await this.getLocalStream(callType);
      this.peerNames.set(toId, peerName || "Unknown User");

      this.wsManager.send("request_call", {
        from: this.playerId,
        to: toId,
        callType,
      });

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
    if (this.localStream) {
      const hasVideo = this.localStream.getVideoTracks().length > 0;
      if (
        (callType === "audio" && !hasVideo) ||
        (callType === "video" && hasVideo)
      ) {
        this.updateTrackStates(callType);
        return this.localStream;
      }
      this.localStream.getTracks().forEach((track) => track.stop());
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Media devices not supported");
    }

    const constraints = {
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
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.updateTrackStates(callType);
    return stream;
  }

  private updateTrackStates(callType: "audio" | "video") {
    if (!this.localStream) return;
    this.localStream
      .getAudioTracks()
      .forEach((track) => (track.enabled = this.micEnabled));
    if (callType === "video") {
      this.localStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = this.videoEnabled));
    }
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

    window.dispatchEvent(
      new CustomEvent("incomingCall", { detail: { from, fromName, callType } }),
    );

    this.scene.time.delayedCall(30000, () => {
      if (this.currentIncomingCall) this.declineCall();
    });
  }

  private async acceptCall() {
    if (!this.currentIncomingCall) return;

    const { from, fromName, callType } = this.currentIncomingCall;

    try {
      this.localStream = await this.getLocalStream(callType);
      const pc = this.createPeerConnection(from);
      this.peerConnections.set(from, pc);

      this.localStream
        .getTracks()
        .forEach((track) => pc.addTrack(track, this.localStream!));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

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

      this.hideIncomingCallModal();

      this.activeCalls.set(from, {
        peerId: from,
        peerName: fromName,
        callType,
        status: "connecting",
        startTime: Date.now(),
      });

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
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
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
    const peerName = this.peerNames.get(peerId) || "Unknown User";
    window.dispatchEvent(
      new CustomEvent("remoteStreamAdded", {
        detail: { peerId, stream, peerName },
      }),
    );
  }

  private declineCall() {
    if (this.currentIncomingCall) {
      this.wsManager.send("call_response", {
        from: this.currentIncomingCall.from,
        to: this.playerId,
        accepted: false,
      });
      this.hideIncomingCallModal();
    }
  }

  private hideIncomingCallModal() {
    this.currentIncomingCall = null;
    window.dispatchEvent(new CustomEvent("incomingCallEnded"));
  }

  handleCallResponse(data: Record<string, unknown>) {
    const { from, accepted } = data as { from: string; accepted: boolean };
    if (!accepted) this.cleanupCall(from);
  }

  async handleWebRTCSignal(data: Record<string, unknown>) {
    const { from, data: signalData } = data as {
      from: string;
      data: { type: string; sdp?: string; candidate?: RTCIceCandidateInit };
    };

    try {
      if (signalData.type === "offer") {
        let pc = this.peerConnections.get(from);
        if (!pc) {
          pc = this.createPeerConnection(from);
          this.peerConnections.set(from, pc);
          if (this.localStream) {
            this.localStream
              .getTracks()
              .forEach((track) => pc!.addTrack(track, this.localStream!));
          }
        }

        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: "offer", sdp: signalData.sdp }),
        );
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.wsManager.send("webrtc_signal", {
          from: this.playerId,
          to: from,
          data: { type: "answer", sdp: answer.sdp },
        });
      } else if (signalData.type === "answer") {
        const pc = this.peerConnections.get(from);
        if (pc)
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: "answer", sdp: signalData.sdp }),
          );
      } else if (signalData.type === "candidate" && signalData.candidate) {
        const pc = this.peerConnections.get(from);
        if (pc)
          await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
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
    window.dispatchEvent(
      new CustomEvent("remoteStreamRemoved", { detail: { peerId } }),
    );

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
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
        if (!enabled) track.stop();
      });
    } else if (enabled) {
      this.initializeAudioTracks();
    }
  }

  toggleVideo(enabled: boolean) {
    this.videoEnabled = enabled;
    if (this.localStream) {
      this.localStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = enabled));
    } else if (enabled) {
      this.initializeVideoTracks();
    }
  }

  private async initializeTracks(type: "audio" | "video") {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;

      const constraints =
        type === "audio"
          ? {
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            }
          : {
              video: {
                width: { ideal: 320 },
                height: { ideal: 240 },
                facingMode: "user",
              },
            };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (this.localStream) {
        stream
          .getTracks()
          .forEach((track) => this.localStream!.addTrack(track));
      } else {
        this.localStream = stream;
        // Add the other type if enabled
        const otherType = type === "audio" ? "video" : "audio";
        if (
          (type === "audio" && this.videoEnabled) ||
          (type === "video" && this.micEnabled)
        ) {
          const otherStream = await navigator.mediaDevices.getUserMedia(
            otherType === "audio"
              ? {
                  audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                  },
                }
              : {
                  video: {
                    width: { ideal: 320 },
                    height: { ideal: 240 },
                    facingMode: "user",
                  },
                },
          );
          otherStream
            .getTracks()
            .forEach((track) => this.localStream!.addTrack(track));
        }
      }

      this.updateTrackStates(type === "video" ? "video" : "audio");
    } catch (error) {
      console.error(`Failed to initialize ${type} tracks:`, error);
    }
  }

  private async initializeVideoTracks() {
    await this.initializeTracks("video");
  }

  private async initializeAudioTracks() {
    await this.initializeTracks("audio");
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
