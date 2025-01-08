const WebSocket = require('ws');
const express = require('express');
// สร้าง WebSocket Server
const wss = new WebSocket.Server({ port: 4000 });

console.log('Chat Server is running on ws://localhost:4000');

// เมื่อมี client เชื่อมต่อ
wss.on('connection', (ws) => {
    console.log('A new client connected.');

    // ส่งข้อความต้อนรับ
    ws.send('Welcome to the chat!');

    // รับข้อความจาก client
    ws.on('message', (message) => {
        console.log(`Received: ${message}`);

        // ส่งข้อความไปยังทุก client
        wss.clients.forEach((client) => {
          
            if (client.readyState === WebSocket.OPEN) {
                client.send(message); // ส่งข้อความ
            }
        });
    });

 

    // กรณี client ปิดการเชื่อมต่อ
    ws.on('close', () => {
        console.log('A client disconnected.');
    });
});
