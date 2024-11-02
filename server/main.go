package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strconv"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

type Message struct {
	Type      string  `json:"type"`
	Timestamp float64 `json:"timestamp"`
	Payload   *string `json:"payload,omitempty"`
	SenderID  string  `json:"sender_id"`
}

var clients = make(map[*websocket.Conn]bool)
var broadcast = make(chan Message)
var currTimeStamp float64 = 0

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	log.Println("New websocket connection added")
	if err != nil {
		log.Println("Error upgrading to websocket:", err)
		return
	}
	defer ws.Close()

	clients[ws] = true
	var senderID = fmt.Sprintf("%p", ws)
	initialMsg := Message{
		Type:      "welcome",
		Timestamp: currTimeStamp,
		Payload:   nil,
		SenderID:  "",
	}
	log.Println("sending message", initialMsg)
	if err := ws.WriteJSON(initialMsg); err != nil {
		log.Println("Error sending initial message:", err)
	}

	for {
		var msg Message
		err := ws.ReadJSON(&msg)
		if err != nil {
			log.Println("Error reading JSON:", err)
			log.Println(&msg)
			delete(clients, ws)
			break
		}

		msg.SenderID = senderID
		broadcast <- msg
	}
}

func handleMessages() {
	for {
		msg := <-broadcast
		for client := range clients {

			if fmt.Sprintf("%p", client) == msg.SenderID {
				continue
			}
			currTimeStamp = float64(msg.Timestamp)
			err := client.WriteJSON(msg)
			if err != nil {
				log.Println("Error writing JSON:", err)
				client.Close()
				delete(clients, client)
			}
		}
	}
}

func sendVideo(w http.ResponseWriter, r *http.Request) {

	rangeHeader := r.Header.Get("Range")
	if rangeHeader == "" {
		http.Error(w, "Bad request, missing Range header", http.StatusBadRequest)
		return
	}

	const videoPath = "C:\\projects\\streamlink\\starcraft.mp4"
	fileInfo, err := os.Stat(videoPath)
	if err != nil {
		log.Println("Error getting file stats:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	fileSizeBytes := fileInfo.Size()
	const CHUNK_SIZE = 1000000 // 1mb

	re := regexp.MustCompile(`bytes=(\d+)-(\d*)`)
	matches := re.FindStringSubmatch(rangeHeader)
	if len(matches) < 2 {
		http.Error(w, "Invalid range format", http.StatusBadRequest)
		return
	}

	startByte, err := strconv.ParseInt(matches[1], 10, 64)
	if err != nil {
		log.Println("Error parsing starting byte:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	var endByte int64
	if matches[2] != "" {
		endByte, err = strconv.ParseInt(matches[2], 10, 64)
		if err != nil {
			log.Println("Error parsing ending byte:", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
	} else {
		endByte = startByte + CHUNK_SIZE - 1 // No end byte specified, set to chunk size
	}

	if endByte >= fileSizeBytes {
		endByte = fileSizeBytes - 1
	}

	w.Header().Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", startByte, endByte, fileSizeBytes))
	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", endByte-startByte+1))
	w.Header().Set("Content-Type", "video/mp4")
	w.WriteHeader(http.StatusPartialContent)

	file, err := os.Open(videoPath)
	if err != nil {
		log.Println("Error opening file:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	if _, err := file.Seek(startByte, io.SeekStart); err != nil {
		log.Println("Error seeking in file:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if _, err := io.CopyN(w, file, endByte-startByte+1); err != nil {
		log.Println("Error streaming file:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

}

func main() {
	http.HandleFunc("/ws", handleConnections)
	http.HandleFunc("/stream", sendVideo)

	go handleMessages()

	log.Println("Server started on 8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
