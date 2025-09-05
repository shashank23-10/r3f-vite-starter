import { Canvas } from "@react-three/fiber";
import { Experience } from "./components/Experience";
import { SocketManager, socket, userAtom, charactersAtom } from "./components/SocketManager";
import { Login } from "./components/Login";
import { Persona } from "./components/Persona";
import { Avatar } from "./components/Avatar"; 
import {  useMemo, useState } from "react";
import { Chat } from "./components/Chat";
import { VoiceChat } from "./components/VoiceChat";
import MiniMap from "./components/MiniMap";
import { useAtom } from "jotai";

function App() {
  const [step, setStep] = useState("login"); // login → persona → avatar → space

  const [user] = useAtom(userAtom);
  const [characters] = useAtom(charactersAtom);

  // ✅ Wrap onNext handlers so we can add side effects if needed
  const handleLoginNext = (name) => {
    socket.emit("setName", name); // sync username with server
    setStep("persona");
  };

  const markers = (() => {
    // Matches your floor plane 50×50 centered at (0,0)
    const X_MIN = -25, X_MAX = 25;
    const Z_MIN = -25, Z_MAX = 25;
    const toPercent = (v, min, max) => {
      const c = Math.min(Math.max(v, min), max);
      return ((c - min) / (max - min)) * 100;
    };
    const colorFromId = (id) => {
      let h = 0;
      const s = String(id);
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
      return `hsl(${h}, 70%, 45%)`;
    };
    return characters.map((c) => {
      const [wx, , wz] = c.position || [0, 0, 0];
      const xPct = toPercent(wx, X_MIN, X_MAX);
      const yPct = 100 - toPercent(wz, Z_MIN, Z_MAX); // invert so +Z is up
      return {
        id: c.id,
        x: xPct,
        y: yPct,
        label: c.id === user ? `${c.name || "You"} (You)` : (c.name || "Player"),
        color: c.id === user ? "#2563eb" : colorFromId(c.id),
      };
    });
  })();

  return (
    <>
      <SocketManager />
      {step === "login" && <Login onNext={() => setStep("persona")} />}
      {step === "persona" && <Persona onNext={() => setStep("avatar")} />}
      {step === "avatar" && <Avatar onNext={() => setStep("space")} />} 
      {step === "space" && (
        <>
        <Canvas shadows camera={{ position: [8, 8, 8], fov: 30 }}>
          <color attach="background" args={["#ececec"]} />
          <Experience />
        </Canvas>
        <Chat /> {/* ✅ Multiplayer chat window */}
        <VoiceChat
            userId={user}
            peers={characters.map((c) => c.id)}
        />
        <MiniMap
          src="/assets/map_wireframe.png"
          markers={markers}
          title="Insight Center Map"
          miniScale={0.20}
        />
        </>
      )}      
    </>
  );
}

export default App;
