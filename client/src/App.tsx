import { useEffect, useRef } from 'react';

type MessageType = "play" | "pause" | "update" | "welcome";

function App() {
  const socket = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isReactingToMessage = useRef<boolean>(false);
  const lastSendTimeStamp = useRef<number | null>(null);

  useEffect(() => {
    socket.current = new WebSocket("ws://dev.midnight.cat/api/ws");

    socket.current.onmessage = function (event) {
      const message = JSON.parse(event.data);
      console.log("Message received: ", message);
      
      isReactingToMessage.current = true;

      if(videoRef.current) {
        if (message.type === "play") {
          videoRef.current.play();
          videoRef.current.currentTime = message.timestamp / 1000;
        } else if (message.type === "pause") {
          videoRef.current.pause();
          videoRef.current.currentTime = message.timestamp / 1000;
        } else if (message.type === "update" || message.type === "welcome") {
          videoRef.current.currentTime = message.timestamp / 1000;
        }
        lastSendTimeStamp.current = videoRef.current.currentTime * 1000;
      }

    };

    return () => {
      socket.current?.close();
    };
  }, []);

  function sendMessage(type: MessageType, timestamp: number) {
    if (socket.current) {
      console.log(`[SENT]: type: ${type} ts: ${timestamp}`)
      socket.current.send(JSON.stringify({ type, timestamp }));
    }
  }

  const handlePlay = () => {
    if(!videoRef.current) return;
    const currentTime = Math.floor(videoRef.current.currentTime * 1000);
    if(!isReactingToMessage.current) {
      console.log(`[SEND]: curr: ${currentTime} last: ${lastSendTimeStamp.current} isReacting: ${isReactingToMessage.current}`)
      sendMessage("play", currentTime);
      lastSendTimeStamp.current = currentTime;
    } else {
      isReactingToMessage.current = false;
      lastSendTimeStamp.current = currentTime;
    }
  }

  const handlePause = () => {
    if(!videoRef.current) return;
      const currentTime = Math.floor(videoRef.current.currentTime * 1000);
    if(!isReactingToMessage.current) {
      console.log(`[SEND]: curr: ${currentTime} last: ${lastSendTimeStamp.current} isReacting: ${isReactingToMessage.current}`)
      sendMessage("pause", currentTime);
      lastSendTimeStamp.current = currentTime;
    } else {
      isReactingToMessage.current = false;
      lastSendTimeStamp.current = currentTime;
    }
  }

  const handleSeeked = () => {
    if(!videoRef.current) return;
      const currentTime = Math.floor(videoRef.current.currentTime * 1000);
    if(!isReactingToMessage.current) {
      console.log(`[SEND]: curr: ${currentTime} last: ${lastSendTimeStamp.current} isReacting: ${isReactingToMessage.current}`)
      sendMessage("update", currentTime);
      lastSendTimeStamp.current = currentTime;
    } else {
      isReactingToMessage.current = false;
      lastSendTimeStamp.current = currentTime;
    }
  }


  return (
    <div>
      <video
        ref={videoRef}
        onSeeking={handleSeeked}
        onPlay={handlePlay}
        onPause={handlePause}
        muted
        controls
        width="1000"
        playsInline
        controlsList="nodownload noplaybackrate"z
        disablePictureInPicture 
      >
        <source src="https://dev.midnight.cat/api/stream" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

export default App;
