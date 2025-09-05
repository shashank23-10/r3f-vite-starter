// src/components/Persona.jsx
import { useAtom } from "jotai";
import { atom } from "jotai";
import { motion } from "framer-motion";

export const personaAtom = atom(null);

export function Persona({ onNext }) {
  const [, setPersona] = useAtom(personaAtom);

  const options = [
    { id: "employee", label: "Employee" },
    { id: "client", label: "Client" },
    { id: "partner", label: "Partner" },
  ];

  const handleSelect = (id) => {
    setPersona(id);
    onNext(); // go directly to next step (avatar selection)
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundImage: "url('/backgrounds/Background.jpg')", // ✅ same background
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
          Select Your Persona
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%" }}>
          {options.map((opt) => (
            <motion.button
              key={opt.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(opt.id)}
              style={{
                width: "100%",
                padding: "0.75rem",
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
              {opt.label}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
