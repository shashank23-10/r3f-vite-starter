// src/components/VoiceChat.jsx
import { useEffect, useRef, useState } from "react";
import { socket } from "./SocketManager";

export function VoiceChat({ userId, peers }) {
  const peerConnections = useRef({});
  const localStream = useRef(null);
  const remoteAudioElements = useRef({}); // ✅ keep 1 audio per peer
  const [muted, setMuted] = useState(false);

  const makingOffer = useRef(false);
  const ignoreOffer = useRef(false);
  const isPolite = true;

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      localStream.current = stream;

      // === Offer ===
      socket.on("webrtc-offer", async ({ from, offer }) => {
        const pc = createPeerConnection(from);

        const offerCollision =
          makingOffer.current || pc.signalingState !== "stable";

        ignoreOffer.current = !isPolite && offerCollision;
        if (ignoreOffer.current) return;

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("webrtc-answer", { target: from, answer });
        } catch (err) {
          console.error("Error handling offer", err);
        }
      });

      // === Answer ===
      socket.on("webrtc-answer", async ({ from, answer }) => {
        const pc = peerConnections.current[from];
        if (!pc) return;
        try {
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          }
        } catch (err) {
          console.error("Error setting remote answer", err);
        }
      });

      // === ICE ===
      socket.on("webrtc-candidate", async ({ from, candidate }) => {
        const pc = peerConnections.current[from];
        if (!pc) return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding ICE", err);
        }
      });

      // === Start offers ===
      peers.forEach((peerId) => {
        if (peerId !== userId && !peerConnections.current[peerId]) {
          makeOffer(peerId);
        }
      });
    });

    return () => {
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      peerConnections.current = {};
      Object.values(remoteAudioElements.current).forEach((audio) =>
        audio.remove()
      );
      remoteAudioElements.current = {};
      socket.off("webrtc-offer");
      socket.off("webrtc-answer");
      socket.off("webrtc-candidate");
    };
  }, [peers]);

  function createPeerConnection(peerId) {
    const pc = new RTCPeerConnection();

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) =>
        pc.addTrack(track, localStream.current)
      );
    }

    pc.ontrack = (event) => {
      // ✅ Ensure one <audio> per peer
      if (!remoteAudioElements.current[peerId]) {
        const audio = document.createElement("audio");
        audio.srcObject = event.streams[0];
        audio.autoplay = true;
        audio.style.display = "none"; // hidden
        document.body.appendChild(audio);
        remoteAudioElements.current[peerId] = audio;
      } else {
        remoteAudioElements.current[peerId].srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-candidate", {
          target: peerId,
          candidate: event.candidate,
        });
      }
    };

    peerConnections.current[peerId] = pc;
    return pc;
  }

  async function makeOffer(peerId) {
    const pc = createPeerConnection(peerId);
    try {
      makingOffer.current = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc-offer", { target: peerId, offer });
    } catch (err) {
      console.error("Error creating offer", err);
    } finally {
      makingOffer.current = false;
    }
  }

  // ✅ Toggle mic strictly
  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = muted; // inverse of current state
      });
      setMuted(!muted);
    }
  };

  return (
    <button
      onClick={toggleMute}
      style={{
        position: "absolute",
        top: "1rem",
        left: "1rem",
        width: "50px",
        height: "50px",
        borderRadius: "50%",
        background: muted
          ? "rgba(239,68,68,0.9)" // red when muted
          : "rgba(34,197,94,0.9)", // green when active
        color: "white",
        fontSize: "1.5rem",
        border: "none",
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        zIndex: 1000,
      }}
    >
      {muted ? "🔇" : "🎤"}
    </button>
  );
}
