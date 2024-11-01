import { useEffect, useRef, useState } from 'react';

type MessageType = "play" | "pause" | "update";

function App() {
  const socket = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [lastSentTimestamp, setLastSentTimestamp] = useState<number | null>(null); 
  useEffect(() => {
    socket.current = new WebSocket("ws://localhost:8080/ws");

    socket.current.onmessage = function(event) {
      const message = JSON.parse(event.data);
      console.log("Message received: ", message);

      if (message.type === "play" && videoRef.current) {
        videoRef.current.currentTime = message.timestamp / 1000;
        videoRef.current.play(); 
      } else if (message.type === "pause" && videoRef.current) {
        videoRef.current.pause();
      } else if (message.type === "update" && videoRef.current) {
        videoRef.current.currentTime = message.timestamp / 1000; 
      }
    };

    return () => {
      socket.current?.close(); 
    };
  }, []);

  function sendMessage(type: MessageType, timestamp: number, payload?: string) {
    if (socket.current) {
      socket.current.send(JSON.stringify({ type, timestamp, payload }));
    }
  }

  const handleSeeked = () => {
    if (videoRef.current) {
      const currentTime = Math.floor(videoRef.current.currentTime * 1000);

      if (lastSentTimestamp !== currentTime) {
        sendMessage("update", currentTime); 
        setLastSentTimestamp(currentTime);
      }
    }
  };

  return (
    <div>
      <video ref={videoRef} onSeeked={handleSeeked} controls width="1000" playsInline>
        <source src="http://localhost:8080/stream" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <button onClick={() => {
        if (videoRef.current) {
          videoRef.current.play();
          const currentTime = Math.floor(videoRef.current.currentTime * 1000);
          sendMessage("play", currentTime);
        }
      }}>Play</button>
      <button onClick={() => {
        if (videoRef.current) {
          videoRef.current.pause();
          const currentTime = Math.floor(videoRef.current.currentTime * 1000);
          sendMessage("pause", currentTime);
        }
      }}>Pause</button>
    </div>
  );
}

export default App;
