const WebSocket = require('ws');
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve the chat client HTML file
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'socket-livechat-client.html'));
});

app.listen(PORT, () => {
    console.log(`Chat Client is running on http://localhost:${PORT}`);
});

// WebSocket Server
const wss = new WebSocket.Server({ port: 4000 });
console.log('Chat Server is running on ws://localhost:4000');

// เก็บข้อมูลผู้ใช้และห้อง
const users = new Map(); // เก็บ userId -> WebSocket
const rooms = new Map(); // เก็บ roomId -> Set(userId)

wss.on('connection', (ws) => {
    console.log('A new client connected.');

    // เมื่อมี client เชื่อมต่อ ให้ผู้ใช้ระบุ userId
    ws.send(JSON.stringify({ type: 'init', message: 'Please send your userId to identify yourself. กรุณาส่งรหัสผู้ใช้ของคุณเพื่อระบุตัวตนของคุณ' }));

    // รับข้อความจาก client
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);

            switch (message.type) {
                case 'register': {
                    // ลงทะเบียนผู้ใช้
                    const { userId } = message;
                    if (userId) {
                        users.set(userId, ws);
                        ws.userId = userId;
                        ws.send(JSON.stringify({ type: 'system', message: 'Registered successfully!' }));
                        console.log(`User registered: ${userId}`);
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: 'Invalid userId.' }));
                    }
                    break;
                }

                case 'joinRoom': {
                    // เข้าร่วมห้อง
                    const { userId, roomId } = message;
                    if (users.has(userId)) {
                        if (!rooms.has(roomId)) {
                            rooms.set(roomId, new Set());
                        }
                        rooms.get(roomId).add(userId);
                        ws.send(JSON.stringify({ type: 'system', message: `Joined room: ${roomId}` }));
                        console.log(`User ${userId} joined room: ${roomId}`);
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: 'User not registered.' }));
                    }
                    break;
                }

                case 'privateMessage': {
                    // ส่งข้อความแบบ 1:1
                    const { toUserId, fromUserId, content } = message;
                   //ผู้รับ recipient
                    const recipient = users.get(toUserId);
                    if (recipient && recipient.readyState === WebSocket.OPEN) {
                        recipient.send(JSON.stringify({ type: 'privateMessage', from: fromUserId, content }));
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: 'Recipient not available.' }));
                    }
                    break;
                }

                case 'groupMessage': {
                    // ส่งข้อความในห้อง
                    const { roomId, fromUserId, content } = message;
                    if (rooms.has(roomId)) {
                        rooms.get(roomId).forEach((userId) => {
                            if (userId !== fromUserId) {
                                const client = users.get(userId);
                                if (client && client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({ type: 'groupMessage', from: fromUserId, room: roomId, content }));
                                }
                            }
                        });
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: 'Room not found.' }));
                    }
                    break;
                }

                default:
                    ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type.' }));
            }
        } catch (err) {
            console.error('Error processing message:', err);
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format.' }));
        }
    });

    // กรณี client ปิดการเชื่อมต่อ
    ws.on('close', () => {
        console.log('A client disconnected.');
        if (ws.userId) {
            users.delete(ws.userId);
            // ลบผู้ใช้จากทุกห้องที่เกี่ยวข้อง
            rooms.forEach((members, roomId) => {
                members.delete(ws.userId);
                if (members.size === 0) {
                    rooms.delete(roomId);
                }
            });
        }
    });
});
