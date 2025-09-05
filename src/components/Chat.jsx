// src/components/Chat.jsx
import { useEffect, useState, useRef } from "react";
import { socket } from "./SocketManager";
import { useAtom } from "jotai";
import { userAtom } from "./SocketManager";

export function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const [user] = useAtom(userAtom);
  const [open, setOpen] = useState(false); // ✅ chat toggle
  const [unread, setUnread] = useState(0); // ✅ unread count

  useEffect(() => {
    socket.on("chatMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);

      // ✅ Increase unread only if chat closed and not own msg
      if (!open && msg.user !== user) {
        setUnread((prev) => prev + 1);
      }
    });

    return () => {
      socket.off("chatMessage");
    };
  }, [open, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (input.trim()) {
      socket.emit("chatMessage", { user, text: input });
      setInput("");
    }
  };

  // ✅ Reset unread when chat is opened
  const openChat = () => {
    setOpen(true);
    setUnread(0);
  };

  // ✅ If chat is closed → show icon with badge
  if (!open) {
    return (
      <button
        onClick={openChat}
        style={{
          position: "absolute",
          bottom: "1rem",
          left: "1rem",
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          background: "rgba(99,102,241,0.9)",
          color: "white",
          fontSize: "1.5rem",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          zIndex: 1000,
        }}
      >
        💬
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              background: "red",
              color: "white",
              fontSize: "0.75rem",
              fontWeight: "600",
              borderRadius: "50%",
              padding: "0.2rem 0.4rem",
              minWidth: "20px",
              textAlign: "center",
              boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
            }}
          >
            {unread}
          </span>
        )}
      </button>
    );
  }

  // ✅ Chat open → show full window
  return (
    <div
      style={{
        position: "absolute",
        bottom: "1rem",
        left: "1rem",
        width: "320px",
        maxHeight: "45vh",
        display: "flex",
        flexDirection: "column",
        backdropFilter: "blur(15px)",
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: "1rem",
        overflow: "hidden",
        fontFamily: "Inter, sans-serif",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        color: "white",
        zIndex: 1000,
      }}
    >
      {/* Header with close button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.5rem 0.75rem",
          background: "rgba(99,102,241,0.9)",
        }}
      >
        <span style={{ fontWeight: "600" }}>Chat</span>
        <button
          onClick={() => setOpen(false)}
          style={{
            background: "transparent",
            color: "white",
            border: "none",
            fontSize: "1.2rem",
            cursor: "pointer",
          }}
        >
          ✖
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          padding: "0.75rem",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {messages.map((msg, i) => {
          const isOwn = msg.user === user;
          return (
            <div
              key={i}
              style={{
                marginBottom: "0.75rem",
                display: "flex",
                flexDirection: "column",
                alignItems: isOwn ? "flex-end" : "flex-start",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  marginBottom: "0.25rem",
                  color: isOwn ? "#ffffffff" : "#ffffffff",
                  textAlign: isOwn ? "right" : "left",
                  width: "100%",
                }}
              >
                {msg.user}
              </span>
              <div
                style={{
                  background: isOwn
                    ? "rgba(99, 101, 241, 0.77)"
                    : "rgba(151, 153, 240, 0.77)",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "1rem",
                  maxWidth: "80%",
                  wordBreak: "break-word",
                  backdropFilter: "blur(10px)",
                  alignSelf: isOwn ? "flex-end" : "flex-start",
                }}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        style={{
          display: "flex",
          borderTop: "1px solid rgba(255,255,255,0.2)",
          padding: "0.5rem",
          background: "rgba(0,0,0,0.3)",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            borderRadius: "0.75rem",
            border: "none",
            outline: "none",
            fontSize: "0.9rem",
            background: "rgba(255,255,255,0.85)",
            color: "black",
            marginRight: "0.5rem",
          }}
        />
        <button
          type="submit"
          style={{
            background: "rgba(102, 110, 233, 0.9)",
            color: "white",
            fontWeight: "600",
            border: "none",
            borderRadius: "0.75rem",
            padding: "0.5rem 1rem",
            cursor: "pointer",
            transition: "background 0.3s",
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
