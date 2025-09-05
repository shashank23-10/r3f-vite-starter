import { Canvas } from "@react-three/fiber";
import { Experience } from "./components/Experience";
import { SocketManager, socket, userAtom, charactersAtom } from "./components/SocketManager";
import { Login } from "./components/Login";
import { Persona } from "./components/Persona";
import { Avatar } from "./components/Avatar"; 
import { useState } from "react";
import { Chat } from "./components/Chat";
import { VoiceChat } from "./components/VoiceChat";
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
        </>
      )}      
    </>
  );
}

export default App;
