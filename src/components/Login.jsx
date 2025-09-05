// src/components/Login.jsx
import { useAtom } from "jotai";
import { userAtom } from "./SocketManager";
import { useState } from "react";
import { motion } from "framer-motion";
import { socket } from "./SocketManager"; // ✅ import socket

export function Login({ onNext }) {
  const [, setUser] = useAtom(userAtom);
  const [name, setName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      setUser(name);               // save username locally
      socket.emit("setName", name); // ✅ send username to server
      onNext();                     // move to persona selection
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundImage: "url('/backgrounds/Background.jpg')",
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

      {/* Glassmorphism card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
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
          width: "26rem",
          color: "white",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: "bold",
            marginBottom: "1rem",
          }}
        >
          Welcome to Insight Centre
        </h1>
        <p
          style={{
            marginBottom: "1.5rem",
            color: "rgba(255,255,255,0.8)",
          }}
        >
          (Enter your name to join the 3D Space)
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              background: "rgba(255,255,255,0.85)",
              border: "none",
              outline: "none",
              fontSize: "1rem",
            }}
          />
          <button
            type="submit"
            style={{
              background: "rgba(99,102,241,0.9)",
              color: "white",
              fontWeight: "600",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              cursor: "pointer",
              transition: "background 0.3s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(79,70,229,1)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(99,102,241,0.9)")
            }
          >
            Continue →
          </button>
        </form>
      </motion.div>
    </div>
  );
}
