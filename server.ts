import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Increase payload limit for phone camera image streaming
app.use(express.json({ limit: '15mb' }));

// In-memory Phone Camera Bridge state
interface PhoneFrameData {
  frameBase64: string;
  timestamp: number;
  deviceInfo: string;
}

let latestPhoneFrame: PhoneFrameData | null = null;
let phoneConnectedAt: number = 0;
const sseClients: express.Response[] = [];

// Gemini client initialization if API key is provided
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// REST & SSE Endpoints for Phone Camera Bridge
app.post('/api/phone/frame', (req, res) => {
  const { frame, deviceInfo } = req.body;
  if (!frame) {
    return res.status(400).json({ error: 'Missing frame data' });
  }

  latestPhoneFrame = {
    frameBase64: frame,
    timestamp: Date.now(),
    deviceInfo: deviceInfo || 'Mobile Camera',
  };
  phoneConnectedAt = Date.now();

  // Broadcast to connected SSE desktop clients
  const payload = `data: ${JSON.stringify({
    timestamp: latestPhoneFrame.timestamp,
    deviceInfo: latestPhoneFrame.deviceInfo,
    frame: latestPhoneFrame.frameBase64,
  })}\n\n`;

  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(payload);
    } catch {
      sseClients.splice(i, 1);
    }
  }

  return res.json({ success: true, timestamp: latestPhoneFrame.timestamp });
});

app.get('/api/phone/frame', (_req, res) => {
  if (!latestPhoneFrame) {
    return res.status(404).json({ error: 'No active phone camera stream' });
  }
  return res.json(latestPhoneFrame);
});

app.get('/api/phone/status', (_req, res) => {
  const isOnline = Date.now() - phoneConnectedAt < 5000;
  return res.json({
    connected: isOnline,
    lastSeen: phoneConnectedAt,
    deviceInfo: latestPhoneFrame?.deviceInfo || null,
  });
});

// SSE endpoint for low-latency live camera frame delivery
app.get('/api/phone/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);

  if (latestPhoneFrame) {
    res.write(
      `data: ${JSON.stringify({
        timestamp: latestPhoneFrame.timestamp,
        deviceInfo: latestPhoneFrame.deviceInfo,
        frame: latestPhoneFrame.frameBase64,
      })}\n\n`
    );
  }

  req.on('close', () => {
    const index = sseClients.indexOf(res);
    if (index !== -1) sseClients.splice(index, 1);
  });
});

// AI Diagram & Math analysis endpoint
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { imageBase64, prompt = 'Analyze this diagram' } = req.body;
    if (!aiClient) {
      return res.status(503).json({
        error: 'Cloud Gemini API key not configured. Using local offline geometry engine.',
      });
    }

    const cleanBase64 = imageBase64 ? imageBase64.replace(/^data:image\/\w+;base64,/, '') : null;
    const contents: any[] = [{ text: prompt }];

    if (cleanBase64) {
      contents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      });
    }

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
    });

    return res.json({
      text: response.text,
      model: 'gemini-2.5-flash',
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || 'Error executing AI analysis',
    });
  }
});

// Mount Vite middleware in development or serve static in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Krypton Vision AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
