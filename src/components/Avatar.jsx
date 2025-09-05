// src/components/Avatar.jsx
import { useAtom } from "jotai";
import { atom } from "jotai";
import { motion } from "framer-motion";
import { socket } from "./SocketManager";

export const avatarAtom = atom(null);

export function Avatar({ onNext }) {
  const [, setAvatar] = useAtom(avatarAtom);

  const handleSelect = (choice) => {
    setAvatar(choice);               // local Jotai state
    socket.emit("setAvatar", choice); // send choice to server
    onNext();                        // proceed to 3D space
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundImage: "url('/backgrounds/Background.jpg')", // ✅ same bg
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
        }}
      />

      {/* Glass card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: "relative",
          zIndex: 10,
          backdropFilter: "blur(20px)",
          background: "rgba(255, 255, 255, 0.15)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          padding: "2.5rem",
          borderRadius: "1rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          width: "28rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          color: "white",
        }}
      >
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: "bold",
            marginBottom: "1.5rem",
            textAlign: "center",
          }}
        >
          Choose Your Avatar
        </h1>

        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            width: "100%",
            justifyContent: "center",
          }}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelect("male")}
            style={{
              flex: 1,
              padding: "1rem",
              borderRadius: "0.75rem",
              fontWeight: "600",
              background: "rgba(99,102,241,0.9)", // indigo-600
              color: "white",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
              transition: "background 0.3s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(79,70,229,1)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.9)")}
          >
            Male 👨
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelect("female")}
            style={{
              flex: 1,
              padding: "1rem",
              borderRadius: "0.75rem",
              fontWeight: "600",
              background: "rgba(236,72,153,0.9)", // pink-500
              color: "white",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
              transition: "background 0.3s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(219,39,119,1)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(236,72,153,0.9)")}
          >
            Female 👩
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
