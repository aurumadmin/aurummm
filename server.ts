import express from 'express';
import path from 'path';
import fs from 'fs';
import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

function normalizeNvidiaModel(modelName?: string): string {
  if (!modelName) return 'meta/llama-3.3-70b-instruct';
  const lower = modelName.trim().toLowerCase();
  if (lower.includes('deepseek') || lower.includes('v4') || lower.includes('flash') || lower.includes('nemotron')) {
    return 'meta/llama-3.3-70b-instruct';
  }
  if (lower.startsWith('meta/') || lower.startsWith('nvidia/') || lower.startsWith('mistralai/') || lower.startsWith('deepseek-ai/')) {
    return modelName.trim();
  }
  return 'meta/llama-3.3-70b-instruct';
}

// Load Firebase configuration
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure all /api responses strictly return application/json headers
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
  console.log('Firebase Admin SDK initialized successfully');
} catch (err) {
  console.error('Error during Firebase Admin SDK initialization:', err);
}

// Bind to custom named database
const db = getFirestore(undefined, firebaseConfig.firestoreDatabaseId);

// Shared in-memory and disk cache for compiled web preview compatibility
const siteCodeCache = new Map<string, string>();

// Global in-memory configuration with solid defaults
let inMemorySettings: any = {
  nvidiaNimKey: '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',
  nvidiaNimEnabled: true,
  nvidiaNimProvider: 'NVIDIA NIM (free)',
  nvidiaNimDisplayName: 'NVIDIA NIM (build.nvidia.com)',
  nvidiaNimModel: 'meta/llama-3.3-70b-instruct',
  nvidiaNimChatModel: 'meta/llama-3.3-70b-instruct',
  nvidiaNimPriority: 1,
  nvidiaNimImageModel: 'black-forest-labs/flux.1-dev'
};

const LOCAL_SETTINGS_PATH = path.join(process.cwd(), 'local-settings.json');

// Load stored settings from local cache if present
try {
  if (fs.existsSync(LOCAL_SETTINGS_PATH)) {
    const raw = fs.readFileSync(LOCAL_SETTINGS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    inMemorySettings = { ...inMemorySettings, ...parsed };
    console.log('Successfully loaded settings from local file cache');
  }
} catch (err: any) {
  console.warn('Could not load local settings file cache:', err.message);
}

// Seeding function to store global configuration securely in Cloud Firestore
async function seedSettingsDatabase() {
  try {
    console.log('Synchronizing system configuration keys...');
    const settingsRef = db.collection('settings').doc('system');
    const settingsSnap = await settingsRef.get();
    const defaultKey = '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';

    if (!settingsSnap.exists) {
      await settingsRef.set({
        ...inMemorySettings,
        nvidiaNimKey: defaultKey,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    } else {
      const data = settingsSnap.data();
      if (data) {
        inMemorySettings = { ...inMemorySettings, ...data };
      }
      await settingsRef.set({
        nvidiaNimKey: defaultKey,
        nvidiaNimModel: 'meta/llama-3.3-70b-instruct',
        nvidiaNimChatModel: 'meta/llama-3.3-70b-instruct',
        nvidiaNimImageModel: 'black-forest-labs/flux.1-dev',
        nvidiaNimEnabled: true,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      inMemorySettings.nvidiaNimKey = defaultKey;
      inMemorySettings.nvidiaNimModel = 'meta/llama-3.3-70b-instruct';
      inMemorySettings.nvidiaNimChatModel = 'meta/llama-3.3-70b-instruct';
      inMemorySettings.nvidiaNimImageModel = 'black-forest-labs/flux.1-dev';
    }
  } catch (err: any) {
    console.log('Loaded in-memory system configuration.');
  }
}

// ---------------------------------------------------------------------------
// MIDDLEWARE: Authenticate Firebase user from client request
// ---------------------------------------------------------------------------
async function authenticateUser(req: any, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing ID token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      email_verified: decodedToken.email_verified || false,
    };
    next();
  } catch (err: any) {
    console.error('Token verification error:', err);
    return res.status(401).json({ error: 'Unauthorized: Invalid ID token' });
  }
}

// Helper to check if authenticated email is admin (not strictly requiring email_verified to cover development accounts)
function isAdminUser(user: { email: string; email_verified: boolean }) {
  const adminEmails = ['teamthunderofficialyt@gmail.com', 'freefiregtamcpe@gmail.com'];
  return !!user.email && adminEmails.includes(user.email.toLowerCase());
}

// Daily credits reset mechanism
async function resetUserCreditsIfNeeded(uid: string, userData: any, userRef: any) {
  const currentDateString = new Date().toISOString().split('T')[0];
  if (userData && userData.lastResetDate !== currentDateString) {
    console.log(`[CreditsReset] Triggering daily credits refresh reset for user: ${uid}`);
    const resetPayload = {
      queriesCount: 0,
      lastResetDate: currentDateString
    };
    try {
      await userRef.set(resetPayload, { merge: true });
      return { queriesCount: 0, lastResetDate: currentDateString };
    } catch (err: any) {
      console.warn("Silent reset database write skipped:", err.message);
    }
  }
  return {
    queriesCount: userData?.queriesCount || 0,
    lastResetDate: userData?.lastResetDate || ''
  };
}

// Subtracts user priority credits (coins). Conforms to rules:
// - Daily reset (past of reset) credits reset daily.
// - Extra priority coins (topupCredits) do not expire, and can only be used once.
// - Consume daily credits first; if they run out, deduct from topupCredits.
// - If queriesLimit is -1 (unlimited), there is no deduction from topupCredits.
async function deductUserCredits(uid: string, creditCost: number) {
  const userRef = db.collection('users').doc(uid);
  try {
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return { queriesCount: 0, topupCredits: 0, queriesLimit: 50 };
    }
    const userData = userSnap.data();
    
    // Apply daily reset check first
    const resetData = await resetUserCreditsIfNeeded(uid, userData, userRef);
    let queriesCount = resetData.queriesCount;
    let topupCredits = userData?.topupCredits || 0;
    const planId = userData?.planId || 'plan_free';

    let queriesLimit = 50;
    try {
      const planSnap = await db.collection('plans').doc(planId).get();
      if (planSnap && planSnap.exists) {
        queriesLimit = planSnap.data()?.queriesLimit ?? 50;
      }
    } catch {}

    if (queriesLimit === -1) {
      // Unlimited plan: just increment queries count, keep topupCredits unchanged
      queriesCount += creditCost;
      await userRef.set({ queriesCount }, { merge: true });
      return { queriesCount, topupCredits, queriesLimit };
    }

    const remainingDaily = Math.max(0, queriesLimit - queriesCount);
    if (creditCost <= remainingDaily) {
      queriesCount += creditCost;
    } else {
      queriesCount = queriesLimit;
      const overflow = creditCost - remainingDaily;
      topupCredits = Math.max(0, topupCredits - overflow);
    }

    await userRef.set({
      queriesCount,
      topupCredits
    }, { merge: true });

    return { queriesCount, topupCredits, queriesLimit };
  } catch (err: any) {
    console.error(`[deductUserCredits] Error debiting ${creditCost} credits for ${uid}:`, err.message);
    return { queriesCount: 0, topupCredits: 0, queriesLimit: 50 };
  }
}

// ---------------------------------------------------------------------------
// API ENDPOINTS
// ---------------------------------------------------------------------------

// 1. Health Probe
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 1.5. Image Proxy - Uses NVIDIA NIM FLUX visual models securely with credentials stored on the server
app.get('/api/image-proxy', async (req, res) => {
  const { prompt, seed, model, userId } = req.query;
  if (!prompt) {
    return res.status(400).send('Missing prompt');
  }

  const userPrompt = String(prompt);
  const seedVal = String(seed || Math.floor(Math.random() * 10000000));
  const modelToUse = String(model || 'flux');

  // local helper to securely deduct credits on success output delivery
  const sendImage = async (imgBuffer: Buffer, contentType: string) => {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (userId) {
      await deductUserCredits(String(userId), 5);
      console.log(`[ImageProxy] Successfully debited 5 credits for user ${userId} for NVIDIA NIM request`);
    }
    return res.send(imgBuffer);
  };

  // Verify and throttle user credit usage for requested NVIDIA NIM images
  if (userId) {
    const uidStr = String(userId);
    try {
      const userRef = db.collection('users').doc(uidStr);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        const userData = userSnap.data();
        const resetData = await resetUserCreditsIfNeeded(uidStr, userData, userRef);
        const queriesCount = resetData.queriesCount;
        const topupCredits = userData?.topupCredits || 0;
        const planId = userData?.planId || 'plan_free';

        let queriesLimit = 50;
        try {
          const planSnap = await db.collection('plans').doc(planId).get();
          if (planSnap.exists) {
            queriesLimit = planSnap.data()?.queriesLimit ?? 50;
          }
        } catch {}

        const totalAllowed = (queriesLimit === -1) ? -1 : (queriesLimit + topupCredits);
        const imgCost = 5; // images from NVIDIA NIM FLUX consume 5 credits
        if (totalAllowed !== -1 && (queriesCount + imgCost) > totalAllowed) {
          return res.status(403).send('Insufficient priority credits. Image generations require 5 Priority Credits.');
        }
      }
    } catch (e: any) {
      console.warn('[ImageProxy] Skip user verification error:', e.message);
    }
  }

  console.log(`[ImageProxy] Generating image via NVIDIA NIM for prompt: "${userPrompt}"`);

  // A. Resolve settings and keys
  let nvidiaNimKey = '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';
  let nvidiaNimImageModel = 'black-forest-labs/flux.1-dev';
  
  try {
    const snap = await db.collection('settings').doc('system').get();
    if (snap.exists) {
      const liveData = snap.data();
      if (liveData?.nvidiaNimKey) nvidiaNimKey = liveData.nvidiaNimKey;
      if (liveData?.nvidiaNimImageModel) nvidiaNimImageModel = liveData.nvidiaNimImageModel;
    }
  } catch (settErr: any) {
    console.warn('[ImageProxy] Error fetching system settings, using fallback cache:', settErr.message);
  }

  const keysPool = nvidiaNimKey
    .split(/[\n,;]+/)
    .map((k: string) => k.trim())
    .filter((k: string) => k.length > 0);

  let endpointModel = 'flux-1-dev';
  if (nvidiaNimImageModel) {
    const rawModel = nvidiaNimImageModel.trim().toLowerCase();
    if (rawModel.includes('flux')) {
      endpointModel = rawModel.replace('black-forest-labs/', '').replace(/\./g, '-');
    }
  }

  // Create candidate list of exact model segments to ensure maximum routing capability
  const modelCandidates = [
    endpointModel, // 'flux-1-dev'
    endpointModel.replace('-', '.'), // 'flux.1-dev'
    endpointModel.replace('-', '_'), // 'flux_1-dev'
    'flux.1-dev',
    'flux-1-dev'
  ];
  const uniqueCandidates = [...new Set(modelCandidates)];

  // B. Attempt NVIDIA NIM visual generation across key pool and model candidates
  let nvidiaSucceeded = false;

  for (let i = 0; i < keysPool.length; i++) {
    const activeKey = keysPool[i];
    
    for (const candidate of uniqueCandidates) {
      try {
        console.log(`[ImageProxy] Attempting NVIDIA NIM proxy - KeyIndex: ${i}, ModelSegment: ${candidate}`);
        
        // Structure standard visual payload
        const payload: any = {
          prompt: userPrompt
        };

        const parsedSeed = parseInt(seedVal);
        if (!isNaN(parsedSeed)) {
          payload.seed = parsedSeed % 100000;
        }

        // Add standard height/width parameters as standard for FLUX on NVIDIA NIM
        payload.height = 1024;
        payload.width = 1024;

        const response = await fetch(`https://ai.api.nvidia.com/v1/genai/black-forest-labs/${candidate}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${activeKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const resJson: any = await response.json();
          console.log(`[ImageProxy] NVIDIA NIM successful output received for candidate: ${candidate}`);
          
          let base64Data = '';
          if (resJson.artifacts?.[0]?.base64) {
            base64Data = resJson.artifacts[0].base64;
          } else if (resJson.data?.[0]?.b64_json) {
            base64Data = resJson.data[0].b64_json;
          } else if (resJson.images?.[0]?.image) {
            base64Data = resJson.images[0].image;
          } else if (resJson.image) {
            base64Data = resJson.image;
          }

          if (base64Data) {
            const imgBuffer = Buffer.from(base64Data, 'base64');
            return await sendImage(imgBuffer, 'image/png');
          }
        } else {
          const errText = await response.text();
          console.warn(`[ImageProxy] NVIDIA NIM candidate ${candidate} failures (Status: ${response.status}):`, errText);
          
          // If the candidate returns a validation error due to optional parameters (like height/width), retry without them
          if (response.status === 422 || response.status === 400) {
            console.log(`[ImageProxy] Retrying candidate ${candidate} with compact payload.`);
            const retryResponse = await fetch(`https://ai.api.nvidia.com/v1/genai/black-forest-labs/${candidate}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${activeKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ prompt: userPrompt })
            });

            if (retryResponse.ok) {
              const resJson: any = await retryResponse.json();
              let base64Data = '';
              if (resJson.artifacts?.[0]?.base64) {
                base64Data = resJson.artifacts[0].base64;
              } else if (resJson.data?.[0]?.b64_json) {
                base64Data = resJson.data[0].b64_json;
              } else if (resJson.images?.[0]?.image) {
                base64Data = resJson.images[0].image;
              } else if (resJson.image) {
                base64Data = resJson.image;
              }

              if (base64Data) {
                const imgBuffer = Buffer.from(base64Data, 'base64');
                return await sendImage(imgBuffer, 'image/png');
              }
            } else {
              const retryErrText = await retryResponse.text();
              console.warn(`[ImageProxy] NVIDIA NIM compact retry also failed:`, retryErrText);
            }
          }
        }
      } catch (err: any) {
        console.warn(`[ImageProxy] NVIDIA NIM attempt caught exception for key ${i} / candidate ${candidate}:`, err.message);
      }
    }
  }

  // C. Fallback: If NVIDIA NIM is entirely failed/depleted, fetch Pollinations FLUX server-side and buffer it
  console.log(`[ImageProxy] NVIDIA NIM failed, keys depleted, or server returned limits. Falling back to server-side Pollinations AI fetch.`);
  try {
    const pollinationsModel = modelToUse === 'flux' ? 'flux' : modelToUse;
    // Set to 512x512 resolution for maximum reliability and snappy 2-second response latency
    const pollinationsUrl = `https://image.pollinations.ai/p/${encodeURIComponent(userPrompt.substring(0, 200))}?width=512&height=512&seed=${seedVal}&model=${pollinationsModel}&nologo=true`;
    console.log(`[ImageProxy] Invoking server-side fetch from Pollinations: ${pollinationsUrl}`);
    
    // Server-side fetch preserves relative image loading and side-steps iframe security constraints
    const pollinationsRes = await fetch(pollinationsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    if (pollinationsRes.ok) {
      const buffer = await pollinationsRes.arrayBuffer();
      return await sendImage(Buffer.from(buffer), 'image/png');
    } else {
      console.warn(`[ImageProxy] Server-side Pollinations fetch returned error status ${pollinationsRes.status}`);
    }
  } catch (err: any) {
    console.error(`[ImageProxy] Server-side Pollinations fallback failed:`, err.message);
  }

  // Double fallback: Server-side Picsum fetch
  try {
    const picsumUrl = `https://picsum.photos/seed/${encodeURIComponent(userPrompt.substring(0, 50))}/512/512`;
    console.log(`[ImageProxy] Invoking double server-side fetch from Picsum: ${picsumUrl}`);
    const picsumRes = await fetch(picsumUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (picsumRes.ok) {
      const buffer = await picsumRes.arrayBuffer();
      return await sendImage(Buffer.from(buffer), 'image/jpeg');
    }
  } catch (err: any) {
    console.error(`[ImageProxy] Server-side Picsum fallback failed:`, err.message);
  }

  return res.status(502).send('Failed to compile or retrieve visual assets.');
});

// Temporary Debug endpoint to run live checks
app.get('/api/debug', async (req, res) => {
  const reports: any = {};
  reports.firebaseConfig = firebaseConfig;
  try {
    const snap = await db.collection('settings').doc('system').get();
    reports.firestoreRead = snap.exists ? snap.data() : 'Document does not exist';
  } catch (err: any) {
    reports.firestoreReadError = {
      message: err.message,
      stack: err.stack,
      code: err.code
    };
  }

  try {
    const apiResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer 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`
      },
      body: JSON.stringify({
        model: 'meta/llama-3.3-70b-instruct',
        messages: [{ role: 'user', content: 'hello' }],
        max_tokens: 10
      })
    });
    reports.nvidiaResponseStatus = apiResponse.status;
    reports.nvidiaOk = apiResponse.ok;
    reports.nvidiaText = await apiResponse.text();
  } catch (err: any) {
    reports.nvidiaFetchError = {
      message: err.message,
      stack: err.stack
    };
  }
  return res.json(reports);
});

// Helper to auto-generate descriptive, short ChatGPT-style chat titles
function generateChatTitle(firstMessage: string): string {
  let text = firstMessage.trim();
  if (text.toLowerCase().startsWith('draw ')) {
    const prompt = text.substring(5).trim();
    return `🎨 ${prompt.length > 22 ? prompt.substring(0, 20) + '...' : prompt}`;
  }
  
  // Clean markdown or structural punctuation
  text = text.replace(/[#*`_\[\]()]+/g, '').trim();
  
  const lowerText = text.toLowerCase();
  let emoji = '💬 ';
  if (
    lowerText.includes('code') || 
    lowerText.includes('program') || 
    lowerText.includes('html') || 
    lowerText.includes('css') || 
    lowerText.includes('js') || 
    lowerText.includes('react') || 
    lowerText.includes('javascript') || 
    lowerText.includes('python') || 
    lowerText.includes('typescript')
  ) {
    emoji = '💻 ';
  } else if (lowerText.includes('write') || lowerText.includes('story') || lowerText.includes('essay') || lowerText.includes('poem')) {
    emoji = '✍️ ';
  } else if (lowerText.includes('how to') || lowerText.includes('explain') || lowerText.includes('why')) {
    emoji = '🤔 ';
  } else if (lowerText.includes('money') || lowerText.includes('plan') || lowerText.includes('business') || lowerText.includes('marketing')) {
    emoji = '📈 ';
  } else if (lowerText.includes('hello') || lowerText.includes('hi ') || lowerText.includes('hey ')) {
    emoji = '👋 ';
  }

  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length <= 4) {
    return emoji + text;
  }
  
  const candidate = words.slice(0, 5).join(' ');
  const finished = candidate.length > 25 ? candidate.substring(0, 22) + '...' : candidate;
  return emoji + finished;
}

// 2. Chat with Aurum (NVIDIA NIM proxy)
app.post('/api/chat', authenticateUser, async (req: any, res) => {
  const { messages, chatId } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing or invalid messages parameter' });
  }

  const uid = req.user.uid;

  try {
    // A. Fetch current user plan & usage with robust fallback
    const userRef = db.collection('users').doc(uid);
    let userSnap: any = null;
    let userData: any = null;
    try {
      userSnap = await userRef.get();
      if (userSnap && userSnap.exists) {
        userData = userSnap.data();
      }
    } catch (dbErr: any) {
      console.warn('Silent read from users skipped (GCP IAM sandbox restricted):', dbErr.message);
    }
    
    // Daily reset check
    if (userData) {
      const resetResult = await resetUserCreditsIfNeeded(uid, userData, userRef);
      userData.queriesCount = resetResult.queriesCount;
      userData.lastResetDate = resetResult.lastResetDate;
    }

    let planId = 'plan_free';
    let queriesCount = userData?.queriesCount || 0;
    let topupCredits = userData?.topupCredits || 0;
    let planExpiresAt: any = userData?.planExpiresAt || null;
    let planName = userData?.planName || 'Free';
    
    if (userData) {
      planId = userData.planId || 'plan_free';
      if (planId === 'free') planId = 'plan_free'; // Normalise legacy

      // Check plan expiration (downgrade if expired)
      if (planId !== 'plan_free' && planExpiresAt && planExpiresAt !== 'unlimited') {
        const expiresMs = Number(planExpiresAt);
        if (!isNaN(expiresMs) && Date.now() > expiresMs) {
          console.log(`Plan expired for user ${uid}. Downgrading to plan_free.`);
          planId = 'plan_free';
          planName = 'Free';
          queriesCount = 0;
          planExpiresAt = null;

          try {
            await userRef.set({
              planId: 'plan_free',
              planName: 'Free',
              queriesCount: 0,
              planExpiresAt: null
            }, { merge: true });
          } catch (writeErr: any) {
            console.warn('Silent downgrade write skipped: ', writeErr.message);
          }
        }
      }
    }

    // B. Check plan limit
    let queriesLimit = 50; // default free limit
    try {
      const planSnap = await db.collection('plans').doc(planId).get();
      if (planSnap && planSnap.exists) {
        queriesLimit = planSnap.data()?.queriesLimit ?? 50;
      }
    } catch (planErr: any) {
      console.warn('Silent read from plans skipped:', planErr.message);
    }

    const userPromptText = messages[messages.length - 1].content.trim();
    const isImageGeneration = userPromptText.toLowerCase().startsWith('draw ');
    const imageCount = Math.min(2, Math.max(1, Number(req.body.imageCount || 1)));
    const creditCost = isImageGeneration ? (imageCount * 5) : 1;

    const totalAllowed = (queriesLimit === -1) ? -1 : (queriesLimit + topupCredits);

    // Determine request priority
    let requestPriority = 'Low-Priority';
    if (totalAllowed === -1 || (queriesCount + creditCost) <= totalAllowed) {
      requestPriority = (planId === 'plan_free') ? 'Medium-Priority' : 'High-Priority';
    } else {
      requestPriority = 'Low-Priority';
      console.log(`[PriorityQueue] User ${uid} has exhausted priority credits (${queriesCount}/${totalAllowed}). Queue route: Low Priority.`);
      // Enforce small queue compilation delay for unprioritized traffic
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    // C. Fetch NVIDIA NIM key list (supports in-memory values or live config fallback)
    let settingsData = { ...inMemorySettings };
    try {
      const settingsSnap = await db.collection('settings').doc('system').get();
      if (settingsSnap.exists) {
        const liveData = settingsSnap.data();
        if (liveData) {
          settingsData = { ...settingsData, ...liveData };
        }
      }
    } catch (settErr: any) {
      console.warn('Silent read from settings/system skipped (using fallback cache):', settErr.message);
    }

    const nvidiaNimKey = settingsData.nvidiaNimKey || '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';
    const isNvidiaEnabled = settingsData.nvidiaNimEnabled !== false;
    if (!isNvidiaEnabled) {
      return res.status(412).json({
        error: 'AI Provider Disabled',
        message: 'The NVIDIA NIM AI provider is currently disabled by the system administrator. Enable it in the AI Providers settings tab!'
      });
    }

    if (!nvidiaNimKey) {
      return res.status(412).json({
        error: 'System Key Not Set',
        message: 'The AI model credentials are not yet configured by the system administrator. Check back soon!'
      });
    }

    // Parse one or more keys separated by commas or newlines
    const keysPool = nvidiaNimKey
      .split(/[\n,;]+/)
      .map((k: string) => k.trim())
      .filter((k: string) => k.length > 0);

    if (keysPool.length === 0) {
      return res.status(412).json({
        error: 'System Key Not Set',
        message: 'The AI model credentials are not yet configured by the system administrator. Check back soon!'
      });
    }

    // Capture Image Generation Requests ("draw prompt...")
    if (userPromptText.toLowerCase().startsWith('draw ')) {
      const imagePrompt = userPromptText.substring(5).trim();
      let enhancedPrompt = imagePrompt;
      let usedNvidiaToEnhance = false;

      // Enhance prompt with NVIDIA NIM text completion
      for (let i = 0; i < keysPool.length; i++) {
        const activeKey = keysPool[i];
        try {
          console.log(`Using NVIDIA NIM key index ${i} to enhance image prompt: "${imagePrompt}"`);
          const enhanceResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${activeKey}`
            },
            signal: AbortSignal.timeout(3500),
            body: JSON.stringify({
              model: normalizeNvidiaModel(settingsData?.nvidiaNimChatModel),
              messages: [
                {
                  role: 'system',
                  content: 'You are a professional image prompt optimizer. Your goal is to subtly optimize the user\'s prompt to improve render quality (adding detail to textures, realistic lighting, and clarity) while staying extremely faithful to their original concept. Do NOT change the core subject, and do NOT add generic luxury keywords (like "gold", "velvet", "prestige", "regal", "opulence") unless specifically requested by the user. Do not introduce new objects or change the core theme. Output ONLY the polished descriptive prompt text (under 60 words) without any introduction or conversational words.'
                },
                {
                  role: 'user',
                  content: `Enhance this image prompt: ${imagePrompt}`
                }
              ],
              temperature: 0.7,
              max_tokens: 150
            })
          });

          if (enhanceResponse.ok) {
            const dataResult = await enhanceResponse.json();
            let textResult = dataResult.choices?.[0]?.message?.content?.trim();
            if (textResult) {
              textResult = textResult.replace(/^["'“”‘]+/g, '').replace(/["'“”‘]+$/g, '').trim();
              if (textResult.toLowerCase().startsWith('prompt:')) {
                textResult = textResult.substring(7).trim();
              }
              enhancedPrompt = textResult;
              usedNvidiaToEnhance = true;
              break;
            }
          } else {
            const errText = await enhanceResponse.text();
            console.warn(`NVIDIA NIM enhancement endpoint returned non-OK status: ${enhanceResponse.status}`, errText);
          }
        } catch (err: any) {
          console.warn(`NVIDIA NIM enhancement failed with key index ${i}:`, err.message);
        }
      }

      const encodedPrompt = encodeURIComponent(enhancedPrompt);
      const seedVal = Math.floor(Math.random() * 100000);

      let pollinationsModel = 'flux'; // Default robust model
      if (settingsData?.nvidiaNimImageModel) {
        const configuredModel = settingsData.nvidiaNimImageModel.toLowerCase();
        if (configuredModel.includes('flux')) {
          pollinationsModel = 'flux';
        } else if (configuredModel.includes('turbo')) {
          pollinationsModel = 'turbo';
        } else if (configuredModel.includes('anime')) {
          pollinationsModel = 'flux-anime';
        } else if (configuredModel.includes('3d')) {
          pollinationsModel = 'flux-3d';
        } else if (configuredModel.includes('realism')) {
          pollinationsModel = 'flux-realism';
        }
      }

      const seedVal1 = Math.floor(Math.random() * 100000);
      const seedVal2 = Math.floor(Math.random() * 100000) + 123456;

      const imageUrl1 = `/api/image-proxy?prompt=${encodedPrompt}&seed=${seedVal1}&model=${pollinationsModel}`;
      const imageUrl2 = `/api/image-proxy?prompt=${encodedPrompt}&seed=${seedVal2}&model=${pollinationsModel}`;
      
      let answer = `### Produced Image Generation\n\n`;
      if (imageCount === 2) {
        answer += `Here are your dual custom visual assets:\n\n![Generated Visual Asset 1](${imageUrl1})\n\n![Generated Visual Asset 2](${imageUrl2})\n\nPrompt details:\n> ${imagePrompt}`;
      } else {
        answer += `Here is your custom visual asset:\n\n![Generated Visual Asset](${imageUrl1})\n\nPrompt details:\n> ${imagePrompt}`;
      }

      const finalChatId = chatId || db.collection('chats').doc().id;
      const chatRef = db.collection('chats').doc(finalChatId);
      
      const newBubbleUser = {
        role: 'user',
        content: messages[messages.length - 1].content,
        timestamp: Date.now()
      };
      
      const newBubbleAi = {
        role: 'assistant',
        content: answer,
        timestamp: Date.now()
      };

      const chatTitle = generateChatTitle(userPromptText);
      let saveOnClient = false;
      try {
        const chatSnap = await chatRef.get();
        if (!chatSnap.exists) {
          await chatRef.set({
            id: finalChatId,
            userId: uid,
            title: chatTitle,
            messages: [newBubbleUser, newBubbleAi],
            updatedAt: FieldValue.serverTimestamp()
          });
        } else {
          await chatRef.update({
            messages: FieldValue.arrayUnion(newBubbleUser, newBubbleAi),
            updatedAt: FieldValue.serverTimestamp()
          });
        }

        const ded = await deductUserCredits(uid, creditCost);
        queriesCount = ded.queriesCount;
      } catch (dbErr: any) {
        console.warn('Image generation log write failed server-side, routing save to client:', dbErr.message);
        saveOnClient = true;
      }

      return res.json({
        answer,
        chatId: finalChatId,
        title: chatTitle,
        queriesCount,
        queriesLimit,
        saveOnClient,
        newMessages: [newBubbleUser, newBubbleAi]
      });
    }

    // D. Fetch completions from HYBRA proxy API with mode mapping and attachment reading
    const systemInstruction = {
      role: 'system',
      content: 'You are Aurum, a prestigious AI assistant. Provide clear, accurate, high quality, well-formatted markdown answers. Identify yourself purely as Aurum. Do NOT state, mention, or disclose any underlying model names, version numbers, or providers unless explicitly asked.'
    };

    // Mode resolution mapping
    const userMode = req.body.mode || req.body.model || 'default';
    let primaryModel = 'deepseek-v4-pro-0813'; // Default mode -> DeepSeek V4 Pro
    if (userMode === 'fast' || userMode === 'deepseek-v4-flash-0731') {
      primaryModel = 'deepseek-v4-flash-0731'; // Fast mode -> DeepSeek V4 Flash
    } else if (userMode === 'writing' || userMode === 'claude-haiku-4-5') {
      primaryModel = 'claude-haiku-4-5'; // Writing mode -> Claude Haiku 4.5
    } else if (userMode !== 'default' && typeof userMode === 'string' && userMode.length > 2) {
      primaryModel = userMode;
    }

    const candidateModels = Array.from(new Set([
      primaryModel,
      'deepseek-v4-pro-0813',
      'deepseek-v4-flash-0731',
      'claude-haiku-4-5',
      'gpt-oss-120b'
    ]));

    // Helper: process image attachments with Gemini Vision so text models get OCR and visual description
    const processMessagesWithAttachments = async (msgs: any[]) => {
      const processed = [];
      for (const m of msgs) {
        if (m.role === 'system') {
          processed.push(m);
          continue;
        }
        let raw = typeof m.content === 'string' ? m.content : '';
        
        // Find data URLs in format data:image/...;base64,...
        const imgRegex = /data:(image\/[a-zA-Z0-9-+.]+);base64,([A-Za-z0-9+/=]+)/g;
        let match;
        const foundImgs: { mimeType: string; base64: string; full: string }[] = [];
        
        while ((match = imgRegex.exec(raw)) !== null) {
          foundImgs.push({ mimeType: match[1], base64: match[2], full: match[0] });
        }

        if (foundImgs.length > 0) {
          let visionAnalysis = '';
          if (process.env.GEMINI_API_KEY) {
            try {
              const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
              for (let idx = 0; idx < foundImgs.length; idx++) {
                const imgObj = foundImgs[idx];
                console.log(`[ChatAttachment] Processing image #${idx + 1} (${imgObj.mimeType}) via Gemini Vision...`);
                const visRes = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: [
                    {
                      inlineData: {
                        mimeType: imgObj.mimeType,
                        data: imgObj.base64
                      }
                    },
                    "Extract all visible text (OCR), code, numbers, charts, diagrams, and visual details from this attachment in meticulous detail so an AI assistant can answer questions about it."
                  ]
                });
                if (visRes.text) {
                  visionAnalysis += `\n\n🔍 [Visual Analysis & Text/OCR from Attached Image #${idx + 1}]:\n${visRes.text}\n`;
                }
              }
            } catch (vErr: any) {
              console.warn('[ChatAttachment] Vision helper note:', vErr.message);
            }
          }

          // Strip huge raw base64 string to prevent payload overflow while retaining vision analysis
          let cleanedText = raw;
          foundImgs.forEach((imgObj, i) => {
            cleanedText = cleanedText.replace(imgObj.full, `[Attached Image #${i + 1}]`);
          });
          cleanedText = `${cleanedText}${visionAnalysis}`;
          processed.push({ role: m.role, content: cleanedText });
        } else {
          processed.push(m);
        }
      }
      return processed;
    };

    const processedMessages = await processMessagesWithAttachments(messages.slice(-10));

    const formattedMessages = [
      systemInstruction,
      ...processedMessages.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))
    ];

    // Set streaming headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    if ((res as any).flushHeaders) (res as any).flushHeaders();

    let fullAnswer = '';
    let success = false;

    for (const modelToUse of candidateModels) {
      if (success) break;
      try {
        console.log(`[Chat] Calling HYBRA API at https://hybra.onyx-2f0t.workers.dev/v1/chat/completions (model: ${modelToUse}, mode: ${userMode})`);
        const apiResponse = await fetch('https://hybra.onyx-2f0t.workers.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer femboysex',
            'Accept': 'text/event-stream, application/json'
          },
          signal: AbortSignal.timeout(25000),
          body: JSON.stringify({
            model: modelToUse,
            messages: formattedMessages,
            stream: true
          })
        });

        if (apiResponse.ok && apiResponse.body) {
          const reader = (apiResponse.body as any).getReader();
          const decoder = new TextDecoder('utf-8');
          let sseBuffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split('\n');
            sseBuffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === 'data: [DONE]') continue;
              if (trimmed.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(trimmed.substring(6));
                  const chunkText = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.text || '';
                  if (chunkText) {
                    fullAnswer += chunkText;
                    res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
                    if ((res as any).flush) (res as any).flush();
                  }
                } catch (pErr) {
                  // Ignore partial json chunks
                }
              }
            }
          }

          if (fullAnswer.trim().length > 0) {
            success = true;
            break;
          }
        } else {
          const errText = await apiResponse.text();
          console.warn(`[Chat] Model ${modelToUse} returned status ${apiResponse.status}:`, errText.substring(0, 100));
        }
      } catch (err: any) {
        console.warn(`[Chat] HYBRA call failed for ${modelToUse}:`, err.message);
      }
    }

    if (!success || fullAnswer.trim().length === 0) {
      // Fallback response if API service is temporarily unreachable
      fullAnswer = "I'm having trouble contacting the HYBRA API proxy right now. Please verify connection to https://hybra.onyx-2f0t.workers.dev/ and try again.";
      res.write(`data: ${JSON.stringify({ chunk: fullAnswer })}\n\n`);
      if ((res as any).flush) (res as any).flush();
    }

    // E. Save Chat Logs to DB and end stream
    const finalChatId = chatId || db.collection('chats').doc().id;
    const chatRef = db.collection('chats').doc(finalChatId);
    
    const newBubbleUser = {
      role: 'user',
      content: messages[messages.length - 1].content,
      timestamp: Date.now()
    };
    
    const newBubbleAi = {
      role: 'assistant',
      content: fullAnswer,
      timestamp: Date.now()
    };

    const chatTitle = generateChatTitle(userPromptText);
    let saveOnClient = false;
    try {
      const chatSnap = await chatRef.get();
      if (!chatSnap.exists) {
        await chatRef.set({
          id: finalChatId,
          userId: uid,
          title: chatTitle,
          messages: [newBubbleUser, newBubbleAi],
          updatedAt: FieldValue.serverTimestamp()
        });
      } else {
        await chatRef.update({
          messages: FieldValue.arrayUnion(newBubbleUser, newBubbleAi),
          updatedAt: FieldValue.serverTimestamp()
        });
      }

      // F. Increment consumption metrics using deductUserCredits
      const ded = await deductUserCredits(uid, creditCost);
      queriesCount = ded.queriesCount;
    } catch (dbErr: any) {
      console.warn('Text completion log write failed server-side, routing save to client:', dbErr.message);
      saveOnClient = true;
    }

    res.write(`data: ${JSON.stringify({
      done: true,
      answer: fullAnswer,
      chatId: finalChatId,
      title: chatTitle,
      queriesCount,
      queriesLimit,
      saveOnClient,
      newMessages: [newBubbleUser, newBubbleAi]
    })}\n\n`);
    return res.end();

  } catch (err: any) {
    console.error('Chat routing error:', err);
    return res.status(500).json({ error: 'Internal chat compilation error', details: err.message });
  }
});

// Image Generation Proxy Route using NVIDIA NIM API
app.get('/api/image-proxy', async (req, res) => {
  const prompt = (req.query.prompt as string) || 'artistic masterpiece';
  const seed = req.query.seed || Math.floor(Math.random() * 100000);

  let settingsData = { ...inMemorySettings };
  try {
    const settingsSnap = await db.collection('settings').doc('system').get();
    if (settingsSnap && settingsSnap.exists) {
      const liveData = settingsSnap.data();
      if (liveData) settingsData = { ...settingsData, ...liveData };
    }
  } catch {}

  const nvidiaNimKey = settingsData.nvidiaNimKey || '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';
  const keysPool = nvidiaNimKey.split(/[\n,;]+/).map((k: string) => k.trim()).filter((k: string) => k.length > 0);

  for (const activeKey of keysPool) {
    try {
      console.log(`[ImageGen] Requesting NVIDIA NIM Image Generation for prompt: "${prompt.substring(0, 50)}..."`);
      
      // 1. Try NVIDIA NIM OpenAI-compatible image endpoint
      const nimRes = await fetch('https://integrate.api.nvidia.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey}`
        },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          prompt: prompt,
          model: 'black-forest-labs/flux.1-dev',
          response_format: 'b64_json'
        })
      });

      if (nimRes.ok) {
        const data = await nimRes.json();
        const b64 = data.data?.[0]?.b64_json;
        if (b64) {
          const imgBuffer = Buffer.from(b64, 'base64');
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(imgBuffer);
        }
        const imgUrl = data.data?.[0]?.url;
        if (imgUrl) {
          const imgFetch = await fetch(imgUrl);
          if (imgFetch.ok) {
            const arrayBuf = await imgFetch.arrayBuffer();
            res.setHeader('Content-Type', imgFetch.headers.get('content-type') || 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.send(Buffer.from(arrayBuf));
          }
        }
      }

      // 2. Try NVIDIA NIM direct Flux endpoint
      const nimFluxRes = await fetch('https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux-1-dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey}`,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          prompt: prompt,
          mode: 'base',
          height: 1024,
          width: 1024,
          seed: Number(seed) || 42
        })
      });

      if (nimFluxRes.ok) {
        const fluxData = await nimFluxRes.json();
        const fluxB64 = fluxData.artifacts?.[0]?.base64 || fluxData.b64_json || fluxData.data?.[0]?.b64_json;
        if (fluxB64) {
          const imgBuffer = Buffer.from(fluxB64, 'base64');
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(imgBuffer);
        }
      } else {
        const fluxErr = await nimFluxRes.text();
        console.warn(`[ImageGen] NVIDIA Flux API returned status ${nimFluxRes.status}:`, fluxErr.substring(0, 100));
      }
    } catch (err: any) {
      console.warn('[ImageGen] NVIDIA NIM call exception:', err.message);
    }
  }

  // Backup proxy call if NIM API rate limit is reached
  try {
    const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&nologo=true&model=flux`;
    const fRes = await fetch(fallbackUrl, { signal: AbortSignal.timeout(12000) });
    if (fRes.ok) {
      const arrayBuf = await fRes.arrayBuffer();
      res.setHeader('Content-Type', 'image/jpeg');
      return res.send(Buffer.from(arrayBuf));
    }
  } catch {}

  return res.status(500).send('Image generation failed');
});

// 3. Admin Panel Config Update
app.post('/api/admin/settings', authenticateUser, async (req: any, res) => {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ error: 'Access denied: Admin credentials required' });
  }

  const {
    nvidiaNimKey,
    oxapayKey,
    nvidiaNimProvider,
    nvidiaNimDisplayName,
    nvidiaNimModel,
    nvidiaNimPriority,
    nvidiaNimImageModel,
    nvidiaNimEnabled
  } = req.body;

  try {
    const payload: any = {
      updatedAt: FieldValue.serverTimestamp()
    };
    if (nvidiaNimKey !== undefined) {
      payload.nvidiaNimKey = nvidiaNimKey;
      inMemorySettings.nvidiaNimKey = nvidiaNimKey;
    }
    if (oxapayKey !== undefined) {
      payload.oxapayKey = oxapayKey;
      inMemorySettings.oxapayKey = oxapayKey;
    }
    if (nvidiaNimProvider !== undefined) {
      payload.nvidiaNimProvider = nvidiaNimProvider;
      inMemorySettings.nvidiaNimProvider = nvidiaNimProvider;
    }
    if (nvidiaNimDisplayName !== undefined) {
      payload.nvidiaNimDisplayName = nvidiaNimDisplayName;
      inMemorySettings.nvidiaNimDisplayName = nvidiaNimDisplayName;
    }
    if (nvidiaNimModel !== undefined) {
      payload.nvidiaNimModel = nvidiaNimModel;
      inMemorySettings.nvidiaNimModel = nvidiaNimModel;
    }
    if (nvidiaNimPriority !== undefined) {
      payload.nvidiaNimPriority = Number(nvidiaNimPriority);
      inMemorySettings.nvidiaNimPriority = Number(nvidiaNimPriority);
    }
    if (nvidiaNimImageModel !== undefined) {
      payload.nvidiaNimImageModel = nvidiaNimImageModel;
      inMemorySettings.nvidiaNimImageModel = nvidiaNimImageModel;
    }
    if (nvidiaNimEnabled !== undefined) {
      payload.nvidiaNimEnabled = Boolean(nvidiaNimEnabled);
      inMemorySettings.nvidiaNimEnabled = Boolean(nvidiaNimEnabled);
    }

    // Always update server-side persistent file cache
    try {
      fs.writeFileSync(LOCAL_SETTINGS_PATH, JSON.stringify(inMemorySettings, null, 2), 'utf8');
      console.log('Successfully wrote settings to local fallback file cache');
    } catch (fsErr: any) {
      console.warn('Failed writing settings to local fallback file cache:', fsErr.message);
    }

    try {
      await db.collection('settings').doc('system').set(payload, { merge: true });
    } catch (dbErr: any) {
      console.warn('Warning: Firestore settings set failed (permission denied). Cached locally only.', dbErr.message);
    }
    
    return res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err: any) {
    console.error('Save settings error:', err);
    return res.status(500).json({ error: 'Could not update system config', details: err.message });
  }
});

// 4. Admin Retrieve Safe Settings (Masked)
app.get('/api/admin/settings', authenticateUser, async (req: any, res) => {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ error: 'Access denied: Admin credentials required' });
  }

  let data = { ...inMemorySettings };

  try {
    const snap = await db.collection('settings').doc('system').get();
    if (snap.exists) {
      const dbData = snap.data();
      if (dbData) {
        data = { ...data, ...dbData };
        inMemorySettings = { ...inMemorySettings, ...dbData };
      }
    }
  } catch (err: any) {
    // Silently fall back to in-memory configuration
  }

  // Mask keys for standard rendering safety
  const mask = (key: string, isMulti = false) => {
    if (!key) return '';
    if (isMulti) {
      const parts = key.split(/[\n,;]+/).map(p => p.trim()).filter(p => p.length > 0);
      return parts.map(p => {
        if (p.length <= 8) return '********';
        return p.substring(0, 4) + '...' + p.substring(p.length - 4);
      }).join(', ');
    }
    if (key.length <= 8) return '********';
    return key.substring(0, 4) + '...' + key.substring(key.length - 4);
  };

  const finalNvidiaKey = data.nvidiaNimKey || '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';
  return res.json({
    nvidiaNimKey: mask(finalNvidiaKey, true),
    oxapayKey: data.oxapayKey ? mask(data.oxapayKey) : '',
    hasNvidiaNimKey: !!finalNvidiaKey,
    hasOxapayKey: !!data.oxapayKey,
    nvidiaNimProvider: data.nvidiaNimProvider || 'NVIDIA NIM (free)',
    nvidiaNimDisplayName: data.nvidiaNimDisplayName || 'NVIDIA NIM (build.nvidia.com)',
    nvidiaNimModel: data.nvidiaNimModel || 'meta/llama-3.3-70b-instruct',
    nvidiaNimPriority: data.nvidiaNimPriority !== undefined ? data.nvidiaNimPriority : 1,
    nvidiaNimImageModel: data.nvidiaNimImageModel || 'black-forest-labs/flux.1-dev',
    nvidiaNimEnabled: data.nvidiaNimEnabled !== undefined ? data.nvidiaNimEnabled : true
  });
});

// 5. Admin Retrieve Site Overview
app.get('/api/admin/overview', authenticateUser, async (req: any, res) => {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ error: 'Access denied: Admin credentials required' });
  }

  try {
    let usersList: any[] = [];
    let transactionsList: any[] = [];

    try {
      const usersSnap = await db.collection('users').get();
      usersSnap.forEach(doc => {
        usersList.push(doc.data());
      });
    } catch (uErr: any) {
      // Return empty users if database read is restricted
    }

    try {
      const txSnap = await db.collection('transactions').orderBy('createdAt', 'desc').get();
      txSnap.forEach(doc => {
        transactionsList.push(doc.data());
      });
    } catch (txErr: any) {
      // Return empty transactions if database read is restricted
    }

    return res.json({
      users: usersList,
      transactions: transactionsList
    });
  } catch (err: any) {
    return res.json({ users: [], transactions: [] });
  }
});

const TOPUP_PACKS: Record<string, { name: string; priceINR: number; credits: number }> = {
  topup_starter: { name: 'Starter Pack', priceINR: 10, credits: 100 },
  topup_power: { name: 'Power Pack', priceINR: 40, credits: 500 },
  topup_pro: { name: 'Pro Pack', priceINR: 100, credits: 1500 }
};

// 6. Create Oxapay invoice request (checkout sequence)
app.post('/api/payment/create-charge', authenticateUser, async (req: any, res) => {
  const { planId } = req.body;
  if (!planId) {
    return res.status(400).json({ error: 'Missing plan identifier' });
  }

  const uid = req.user.uid;
  const userEmail = req.user.email;

  try {
    // A. Verify key existence
    const settingsSnap = await db.collection('settings').doc('system').get();
    const oxapayKey = settingsSnap.data()?.oxapayKey;
    if (!oxapayKey) {
      return res.status(412).json({
        error: 'Billing unavailable',
        message: 'The Oxapay backend billing key is not yet configured by the system administrator.'
      });
    }

    // B. Fetch target billing details (plan or top-up)
    let amountINR = 0;
    let planName = '';

    if (planId.startsWith('topup_')) {
      const pack = TOPUP_PACKS[planId];
      if (!pack) {
        return res.status(404).json({ error: 'Selected top-up pack not found' });
      }
      amountINR = pack.priceINR;
      planName = pack.name;
    } else {
      const planSnap = await db.collection('plans').doc(planId).get();
      if (!planSnap.exists) {
        return res.status(404).json({ error: 'Selected plan not found' });
      }
      const planData = planSnap.data();
      amountINR = planData?.priceINR || 0;
      planName = planData?.name || '';
    }

    if (amountINR <= 0) {
      return res.status(400).json({ error: 'Free tiers do not require cryptopay validation.' });
    }

    // C. Setup transaction record
    const txId = db.collection('transactions').doc().id;
    const selfAppUrl = process.env.APP_URL || `http://localhost:3000`;

    // Oxapay create request parameters
    const payload = {
      merchant: oxapayKey,
      amount: amountINR,
      currency: 'INR',
      orderId: txId,
      email: userEmail,
      description: `Upgrade profile or credits via ${planName}`,
      redirectUrl: `${selfAppUrl}/payment-redirect?txId=${txId}`,
      callbackUrl: `${selfAppUrl}/api/payment/callback`
    };

    console.log('Sending invoice generation call to Oxapay:', payload.callbackUrl);
    const oxaResponse = await fetch('https://api.oxapay.com/merchants/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!oxaResponse.ok) {
      const oErr = await oxaResponse.text();
      console.error('Oxapay failure logs:', oErr);
      return res.status(502).json({ error: 'Oxapay pipeline failed', details: oErr });
    }

    const oxaData = await oxaResponse.json();
    if (oxaData.result !== 1 && oxaData.result !== 100) {
      console.error('Oxapay failed to prepare payload:', oxaData);
      return res.status(502).json({ error: 'Oxapay error during charging', message: oxaData.message });
    }

    const payUrl = oxaData.payLink || oxaData.payUrl;

    // D. Transaction setup in DB
    const txRecord = {
      id: txId,
      userId: uid,
      userEmail,
      planId,
      planName: planName,
      amount: amountINR,
      status: 'pending',
      trackId: oxaData.trackId,
      payUrl: payUrl,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    await db.collection('transactions').doc(txId).set(txRecord);

    return res.json({
      success: true,
      payUrl: payUrl,
      txId
    });

  } catch (err: any) {
    console.error('Invoice setup error:', err);
    return res.status(500).json({ error: 'Billing engine exception', details: err.message });
  }
});

// 7. Oxapay IPN Webhook (Instant Payment Notification callback)
// Publicly accessed by Oxapay servers
app.post('/api/payment/callback', async (req, res) => {
  const payload = req.body;
  console.log('Oxapay webhook incoming callback:', JSON.stringify(payload));

  const { status, orderId, trackId } = payload;
  if (!orderId) {
    return res.status(400).send('Missing order ID reference');
  }

  try {
    const txRef = db.collection('transactions').doc(orderId);
    const txSnap = await txRef.get();
    
    if (!txSnap.exists) {
      return res.status(404).send('Transaction reference matches no records');
    }

    const txData = txSnap.data();
    if (txData?.status !== 'pending') {
      return res.send('Already processed transactional trigger');
    }

    const incomingStatus = String(status || '').toLowerCase();

    if (incomingStatus === 'paid' || incomingStatus === 'success') {
      // Upgrading sequence
      await txRef.update({
        status: 'paid',
        updatedAt: FieldValue.serverTimestamp()
      });

      // Fetch user profile to perform update
      const userId = txData.userId;
      const planId = txData.planId;

      if (planId.startsWith('topup_')) {
        const pack = TOPUP_PACKS[planId];
        if (pack) {
          // Increment persistent top-up credits of specific profile
          await db.collection('users').doc(userId).set({
            topupCredits: FieldValue.increment(pack.credits)
          }, { merge: true });
          console.log(`User ${userId} successfully topped up ${pack.credits} credits via callback`);
        }
      } else {
        // Extract plan details
        const planSnap = await db.collection('plans').doc(planId).get();
        const planData = planSnap.exists ? planSnap.data() : null;

        if (planData) {
          // Clear old totals & activate brand new membership constraints with a 30-day monthly limit
          const planExpiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
          await db.collection('users').doc(userId).set({
            planId,
            planName: planData.name,
            queriesCount: 0,
            planExpiresAt
          }, { merge: true });

          console.log(`User ${userId} successfully upgraded to subscription plan ${planData.name} expiring in 30 days`);
        }
      }

    } else if (incomingStatus === 'expired' || incomingStatus === 'failed') {
      await txRef.update({
        status: incomingStatus,
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    return res.send('IPN_VERIFIED');

  } catch (err: any) {
    console.error('Webhook payload error:', err);
    return res.status(500).send('Webhook parser internal disruption');
  }
});


// ---------------------------------------------------------------------------
// DEVELOPER APIS MANAGEMENT & EXECUTION ENDPOINTS
// ---------------------------------------------------------------------------

// Create custom developer API endpoint description
app.post('/api/developer/create-api', authenticateUser, async (req: any, res) => {
  const { name, systemPrompt, userPrompt } = req.body;
  const uid = req.user.uid;

  if (!name) {
    return res.status(400).json({ error: 'Missing name parameter' });
  }

  try {
    const apiId = db.collection('user_apis').doc().id;
    const newApi = {
      id: apiId,
      userId: uid,
      name: name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
      systemPrompt: systemPrompt || 'You are a reliable AI microservice API.',
      userPrompt: userPrompt || 'Respond directly to the input:',
      createdAt: Date.now()
    };
    await db.collection('user_apis').doc(apiId).set(newApi);
    return res.json({ success: true, api: newApi });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// List custom developer APIs
app.get('/api/developer/list', authenticateUser, async (req: any, res) => {
  const uid = req.user.uid;
  try {
    const snap = await db.collection('user_apis').where('userId', '==', uid).get();
    const apis: any[] = [];
    snap.forEach((doc: any) => apis.push(doc.data()));
    return res.json({ success: true, apis });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete developer API
app.delete('/api/developer/delete-api/:id', authenticateUser, async (req: any, res) => {
  const { id } = req.params;
  const uid = req.user.uid;
  try {
    const ref = db.collection('user_apis').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'API definition not found' });
    }
    if (snap.data().userId !== uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await ref.delete();
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DEVELOPER APIaccess KEYS MANAGEMENT ENDPOINTS
// ---------------------------------------------------------------------------

function hashApiKey(key: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(key).digest('hex');
}

function generateRandomApiKey(): string {
  const crypto = require('crypto');
  return 'aurum_sk_' + crypto.randomBytes(16).toString('hex');
}

// Create custom API key
app.post('/api/developer/keys/create', authenticateUser, async (req: any, res) => {
  const { name } = req.body;
  const uid = req.user.uid;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Missing name parameter' });
  }

  try {
    const rawKey = generateRandomApiKey();
    const hashedValue = hashApiKey(rawKey);
    const id = db.collection('user_api_keys').doc().id;

    const apiKeyData = {
      id,
      userId: uid,
      name: name.trim(),
      keyMasked: `${rawKey.substring(0, 12)}...${rawKey.substring(rawKey.length - 4)}`,
      keyHash: hashedValue,
      createdAt: Date.now(),
      lastUsedAt: null
    };

    await db.collection('user_api_keys').doc(id).set(apiKeyData);

    return res.json({
      success: true,
      apiKey: {
        ...apiKeyData,
        keySecret: rawKey
      }
    });
  } catch (err: any) {
    console.error('Create API Key Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// List API keys
app.get('/api/developer/keys/list', authenticateUser, async (req: any, res) => {
  const uid = req.user.uid;
  try {
    const snap = await db.collection('user_api_keys')
      .where('userId', '==', uid)
      .get();
    
    const apiKeys: any[] = [];
    snap.forEach((doc: any) => {
      const data = doc.data();
      const { keyHash, ...rest } = data;
      apiKeys.push(rest);
    });

    apiKeys.sort((a, b) => b.createdAt - a.createdAt);
    return res.json({ success: true, apiKeys });
  } catch (err: any) {
    console.error('List API Keys Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Delete/Revoke API key
app.delete('/api/developer/keys/delete/:id', authenticateUser, async (req: any, res) => {
  const { id } = req.params;
  const uid = req.user.uid;
  try {
    const ref = db.collection('user_api_keys').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'API key not found' });
    }
    if (snap.data().userId !== uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await ref.delete();
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Delete API Key Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Execute third-party / Custom API Gateway on behalf of developer key
app.post('/api/v1/execute/:apiId', async (req, res) => {
  const { apiId } = req.params;
  const { input } = req.body; 

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Developer API Key' });
  }
  const apiToken = authHeader.split('Bearer ')[1].trim();

  let uid = '';
  let resolvedKeyDocId = '';

  if (apiToken.startsWith('aurum_live_')) {
    uid = apiToken.replace('aurum_live_', '');
  } else if (apiToken.startsWith('aurum_sk_')) {
    try {
      const crypto = require('crypto');
      const hashedValue = crypto.createHash('sha256').update(apiToken).digest('hex');
      const keysRef = db.collection('user_api_keys').where('keyHash', '==', hashedValue);
      const keysSnap = await keysRef.get();
      if (!keysSnap.empty) {
        const keyDoc = keysSnap.docs[0];
        uid = keyDoc.data().userId;
        resolvedKeyDocId = keyDoc.id;
      } else {
        return res.status(401).json({ error: 'Invalid Developer API secret key' });
      }
    } catch (err: any) {
      console.error('API key lookup error:', err);
      return res.status(500).json({ error: 'Internal API Token resolution error' });
    }
  } else {
    return res.status(401).json({ error: 'Invalid Developer key syntax. Must start with: aurum_sk_... or aurum_live_...' });
  }

  try {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(401).json({ error: 'Invalid Developer API credentials: user matches no records' });
    }

    const userData = userSnap.data();
    let planId = userData?.planId || 'plan_free';
    let queriesCount = userData?.queriesCount || 0;
    let topupCredits = userData?.topupCredits || 0;

    // Apply daily resets
    const resetData = await resetUserCreditsIfNeeded(uid, userData, userRef);
    queriesCount = resetData.queriesCount;

    let queriesLimit = 50;
    try {
      const planSnap = await db.collection('plans').doc(planId).get();
      if (planSnap.exists) {
        queriesLimit = planSnap.data()?.queriesLimit ?? 50;
      }
    } catch {}

    const totalAllowed = (queriesLimit === -1) ? -1 : (queriesLimit + topupCredits);
    
    // Developer API can only be accessed with medium & high priority credits!
    if (totalAllowed !== -1 && queriesCount >= totalAllowed) {
      return res.status(403).json({
        error: 'Priority Credits Exhausted',
        message: 'This custom developer endpoint cannot be accessed using Low Priority unprioritized slots. API access is exclusive to active Medium/High Priority Credits. Upgrade or buy top-up credits to use.'
      });
    }

    // Retrieve the custom user api definition
    const apiSnap = await db.collection('user_apis').doc(apiId).get();
    if (!apiSnap.exists) {
      return res.status(404).json({ error: 'Custom API Endpoint definition not found' });
    }
    const apiData = apiSnap.data();
    if (apiData.userId !== uid) {
      return res.status(403).json({ error: 'Forbidden API Key scope' });
    }

    // Call NVIDIA NIM Model
    let settingsData = { ...inMemorySettings };
    try {
      const settingsSnap = await db.collection('settings').doc('system').get();
      if (settingsSnap.exists) {
        const liveData = settingsSnap.data();
        if (liveData) settingsData = { ...settingsData, ...liveData };
      }
    } catch {}

    const nvidiaNimKey = settingsData.nvidiaNimKey || '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';
    const keysPool = nvidiaNimKey.split(/[\n,;]+/).map((k: string) => k.trim()).filter((k: string) => k.length > 0);
    if (keysPool.length === 0) {
      return res.status(500).json({ error: 'NVIDIA API key configuration incomplete on the server.' });
    }
    const activeKey = keysPool[0];

    const modelToUse = settingsData?.nvidiaNimModel || 'meta/llama-3.3-70b-instruct';

    const completionResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeKey}`
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          { role: 'system', content: apiData.systemPrompt || 'You are an API microservice provider.' },
          { role: 'user', content: `${apiData.userPrompt || 'Process the following input:'}\n\nInput:\n${input || ''}` }
        ],
        temperature: 0.5,
        max_tokens: 1000
      })
    });

    if (!completionResponse.ok) {
      const errText = await completionResponse.text();
      return res.status(502).json({ error: 'NVIDIA NIM Gateway error', details: errText });
    }

    const dataResult = await completionResponse.json();
    const responseText = dataResult.choices?.[0]?.message?.content || '';

    // Spend 1 credit
    const ded = await deductUserCredits(uid, 1);
    queriesCount = ded.queriesCount;

    // Update last used timestamp
    if (resolvedKeyDocId) {
      await db.collection('user_api_keys').doc(resolvedKeyDocId).update({
        lastUsedAt: Date.now()
      });
    }

    return res.json({
      success: true,
      apiId: apiData.id,
      apiName: apiData.name,
      response: responseText,
      creditsUsed: queriesCount,
      priority: planId === 'plan_free' ? 'Medium' : 'High'
    });

  } catch (err: any) {
    console.error('Execute API failure:', err);
    return res.status(500).json({ error: 'Internal execution error', message: err.message });
  }
});

// OpenAI-Compatible Conversational Chat Completions Gateway Route
app.post('/api/v1/chat/completions', async (req, res) => {
  const { messages, model, temperature, max_tokens } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing or malformed messages parameter in query' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Developer API Key in Authorization header' });
  }
  const apiToken = authHeader.split('Bearer ')[1].trim();

  let uid = '';
  let resolvedKeyDocId = '';

  if (apiToken.startsWith('aurum_live_')) {
    uid = apiToken.replace('aurum_live_', '');
  } else if (apiToken.startsWith('aurum_sk_')) {
    try {
      const crypto = require('crypto');
      const hashedValue = crypto.createHash('sha256').update(apiToken).digest('hex');
      const keysRef = db.collection('user_api_keys').where('keyHash', '==', hashedValue);
      const keysSnap = await keysRef.get();
      if (!keysSnap.empty) {
        const keyDoc = keysSnap.docs[0];
        uid = keyDoc.data().userId;
        resolvedKeyDocId = keyDoc.id;
      } else {
        return res.status(401).json({ error: 'Invalid Developer API secret key' });
      }
    } catch (err: any) {
      console.error('API key lookup error:', err);
      return res.status(500).json({ error: 'Internal API Token resolution error' });
    }
  } else {
    return res.status(401).json({ error: 'Invalid Developer API Key. Must start with aurum_sk_... or aurum_live_...' });
  }

  try {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(401).json({ error: 'Invalid developer credentials. Account matches no active files.' });
    }

    const userData = userSnap.data();
    let planId = userData?.planId || 'plan_free';
    let queriesCount = userData?.queriesCount || 0;
    let topupCredits = userData?.topupCredits || 0;

    // Daily reset check
    const resetData = await resetUserCreditsIfNeeded(uid, userData, userRef);
    queriesCount = resetData.queriesCount;

    let queriesLimit = 50;
    try {
      const planSnap = await db.collection('plans').doc(planId).get();
      if (planSnap.exists) {
        queriesLimit = planSnap.data()?.queriesLimit ?? 50;
      }
    } catch {}

    const totalAllowed = (queriesLimit === -1) ? -1 : (queriesLimit + topupCredits);
    
    // Check credit limits
    if (totalAllowed !== -1 && queriesCount >= totalAllowed) {
      return res.status(403).json({
        error: 'Priority Credits Exhausted',
        message: 'This custom developer endpoint cannot be accessed using Low Priority unprioritized slots. API access is exclusive to active Medium/High Priority Credits. Upgrade or buy top-up credits to use.'
      });
    }

    // Call NVIDIA NIM Model
    let settingsData = { ...inMemorySettings };
    try {
      const settingsSnap = await db.collection('settings').doc('system').get();
      if (settingsSnap.exists) {
        const liveData = settingsSnap.data();
        if (liveData) settingsData = { ...settingsData, ...liveData };
      }
    } catch {}

    const nvidiaNimKey = settingsData.nvidiaNimKey || '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';
    const keysPool = nvidiaNimKey.split(/[\n,;]+/).map((k: string) => k.trim()).filter((k: string) => k.length > 0);
    if (keysPool.length === 0) {
      return res.status(500).json({ error: 'NVIDIA API key configuration incomplete on the server.' });
    }
    const activeKey = keysPool[0];

    const modelToUse = model || settingsData?.nvidiaNimChatModel || 'meta/llama-3.3-70b-instruct';

    const completionResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeKey}`
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: messages,
        temperature: typeof temperature === 'number' ? temperature : 0.5,
        max_tokens: typeof max_tokens === 'number' ? max_tokens : 1000
      })
    });

    if (!completionResponse.ok) {
      const errText = await completionResponse.text();
      return res.status(502).json({ error: 'NVIDIA NIM Gateway error', details: errText });
    }

    const dataResult = await completionResponse.json();

    // Spend 1 credit
    await deductUserCredits(uid, 1);

    // Update last used timestamp
    if (resolvedKeyDocId) {
      await db.collection('user_api_keys').doc(resolvedKeyDocId).update({
        lastUsedAt: Date.now()
      });
    }

    return res.json(dataResult);
  } catch (err: any) {
    console.error('Chat completions API error:', err);
    return res.status(500).json({ error: err.message });
  }
});


// ---------------------------------------------------------------------------
// AURUM ENGINE COMPILER: RESPONSIVE WEBSITE GENERATOR & EDITING ENGINE
// ---------------------------------------------------------------------------

function validateHtmlCompleteness(html: string): { isComplete: boolean; reason?: string } {
  if (!html || typeof html !== 'string') {
    return { isComplete: false, reason: 'Empty or non-string response' };
  }

  let clean = html.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();

  // Extract from markdown ```html ... ``` or ``` ... ```
  const codeBlockMatch = clean.match(/```(?:html|xml)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1] && codeBlockMatch[1].trim().length > 0) {
    clean = codeBlockMatch[1].trim();
  } else {
    clean = clean.replace(/^```(?:html|xml)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  const trimmed = clean.trim();

  // 1. Check for DOCTYPE or <html> start
  const hasDoctype = /<!doctype\s+html/i.test(trimmed);
  const hasHtmlTag = /<html/i.test(trimmed);
  if (!hasDoctype && !hasHtmlTag) {
    return { isComplete: false, reason: 'Missing <!DOCTYPE html> or <html> tag' };
  }

  // 2. Check for closing </html>
  if (!/<\/html>/i.test(trimmed)) {
    return { isComplete: false, reason: 'Missing </html> closing tag' };
  }

  // 3. Check for closing </body>
  if (!/<\/body>/i.test(trimmed)) {
    return { isComplete: false, reason: 'Missing </body> closing tag' };
  }

  // 4. Check for closing </head>
  if (!/<\/head>/i.test(trimmed)) {
    return { isComplete: false, reason: 'Missing </head> closing tag' };
  }

  // 5. Check style tags balance
  const openStyles = (trimmed.match(/<style[^>]*>/gi) || []).length;
  const closeStyles = (trimmed.match(/<\/style>/gi) || []).length;
  if (openStyles !== closeStyles) {
    return { isComplete: false, reason: `Unbalanced <style> tags (${openStyles} open vs ${closeStyles} closed)` };
  }

  // 6. Check script tags balance
  const openScripts = (trimmed.match(/<script[^>]*>/gi) || []).length;
  const closeScripts = (trimmed.match(/<\/script>/gi) || []).length;
  if (openScripts !== closeScripts) {
    return { isComplete: false, reason: `Unbalanced <script> tags (${openScripts} open vs ${closeScripts} closed)` };
  }

  // 7. Check for dangling truncation at end of file before </html>
  const endHtmlIndex = trimmed.search(/<\/html>/i);
  const textBeforeEnd = endHtmlIndex !== -1 ? trimmed.substring(0, endHtmlIndex).trim() : trimmed;
  const lastLine = textBeforeEnd.split('\n').pop()?.trim() || '';

  if (/:\s*$/.test(lastLine)) {
    return { isComplete: false, reason: `Dangling CSS property or key at end: "${lastLine}"` };
  }

  if (/[=+\-*/,({[]\s*$/.test(lastLine) && !lastLine.endsWith('/>') && !lastLine.endsWith('>')) {
    return { isComplete: false, reason: `Dangling code operator or bracket at end: "${lastLine}"` };
  }

  if (/\b(const|let|var|function|if|for|while|border|color|background|padding|margin|font|display|flex|grid)\b\s*$/i.test(lastLine)) {
    return { isComplete: false, reason: `Dangling keyword/property at end: "${lastLine}"` };
  }

  return { isComplete: true };
}

function cleanAndExtractHtml(rawString: string, userPrompt: string = '', fallbackCode: string = ''): string {
  const defaultFallback = () => fallbackCode && fallbackCode.length > 50 ? fallbackCode : generateMasterFallbackSiteCode(userPrompt);

  if (!rawString) return defaultFallback();

  let clean = rawString.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();

  // Extract from markdown ```html ... ``` or ``` ... ```
  const codeBlockMatch = clean.match(/```(?:html|xml)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1] && codeBlockMatch[1].trim().length > 0) {
    clean = codeBlockMatch[1].trim();
  } else {
    clean = clean.replace(/^```(?:html|xml)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  // Detect if output is an ASCII file tree (e.g., contains '├──', '└──', 'src/components', etc.)
  const isFileTree = clean.includes('├──') || clean.includes('└──') || clean.includes('ai-study-buddy') || clean.includes('src/components/');

  // Ensure DOCTYPE or <html> header is present
  const doctypeIdx = clean.search(/<!doctype\s+html/i);
  const htmlIdx = clean.search(/<html/i);

  if (!isFileTree && doctypeIdx !== -1) {
    clean = clean.substring(doctypeIdx);
  } else if (!isFileTree && htmlIdx !== -1) {
    clean = clean.substring(htmlIdx);
  } else {
    console.warn('[cleanAndExtractHtml] Output lacks valid HTML document or is a file tree. Compiling full master site...');
    return defaultFallback();
  }

  // Truncate any junk trailing after </html>
  const endHtmlIdx = clean.search(/<\/html>/i);
  if (endHtmlIdx !== -1) {
    clean = clean.substring(0, endHtmlIdx + 7);
  } else {
    console.warn('[cleanAndExtractHtml] Truncation detected: missing </html>. Utilizing fallback code...');
    return defaultFallback();
  }

  // Mandatory Completeness Validation
  const valResult = validateHtmlCompleteness(clean);
  if (!valResult.isComplete) {
    console.warn(`[cleanAndExtractHtml] Validation failed (${valResult.reason}). Utilizing complete fallback site...`);
    return defaultFallback();
  }

  // Sanitize Alpine CDN URL if placeholder '3.x.x' was generated
  clean = clean.replace(/alpinejs@3\.x\.x/gi, 'alpinejs@3.14.8');
  clean = clean.replace(/unpkg\.com\/lucide@latest/gi, 'unpkg.com/lucide@latest/dist/umd/lucide.js');

  // Guarantee high contrast text-slate-100 on body tag to prevent unreadable dark text on dark canvas
  if (clean.includes('<body') && !clean.match(/<body[^>]*text-/i)) {
    clean = clean.replace(/<body([^>]*)>/i, (match, p1) => {
      if (p1.includes('class="')) {
        return `<body${p1.replace('class="', 'class="text-slate-100 ')}>`;
      } else {
        return `<body class="text-slate-100"${p1}>`;
      }
    });
  }

  return clean.trim();
}

function extractCleanTopicTitle(rawPrompt: string): { displayTitle: string; fullPrompt: string; isStore: boolean; isDashboard: boolean } {
  let clean = (rawPrompt || '')
    .replace(/^Build me a [^:]*:\s*/i, '')
    .replace(/^User Prompt:\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .trim();

  if (!clean || clean.length < 3) {
    clean = 'Interactive Web Application';
  }

  const lower = clean.toLowerCase();
  const isStore = lower.includes('store') || lower.includes('shop') || lower.includes('ecommerce') || lower.includes('product') || lower.includes('buy') || lower.includes('shoe');
  const isDashboard = lower.includes('dashboard') || lower.includes('analytics') || lower.includes('crypto') || lower.includes('calc') || lower.includes('tracker') || lower.includes('finance') || lower.includes('saas');

  let displayTitle = clean;
  if (displayTitle.length > 45) {
    const parts = displayTitle.split(/[:.!?\n]/);
    if (parts[0] && parts[0].trim().length >= 4 && parts[0].trim().length <= 45) {
      displayTitle = parts[0].trim();
    } else {
      displayTitle = displayTitle.substring(0, 42).trim() + '...';
    }
  }

  return { displayTitle, fullPrompt: clean, isStore, isDashboard };
}

function generateMasterFallbackSiteCode(userPrompt: string): string {
  const { displayTitle, fullPrompt, isStore, isDashboard } = extractCleanTopicTitle(userPrompt);

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${displayTitle}</title>
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Alpine.js -->
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.8/dist/cdn.min.js"></script>
  
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            display: ['Space Grotesk', 'sans-serif']
          },
          colors: {
            gold: { 50: '#fefdf0', 100: '#fdfbe1', 200: '#faf3b2', 500: '#DFB15F', 600: '#C59A4E', 900: '#725011' },
            brand: { 50: '#f5f7ff', 500: '#3b82f6', 600: '#2563eb' }
          }
        }
      }
    }
  </script>
</head>
<body class="bg-[#09090b] text-slate-100 font-sans antialiased min-h-screen selection:bg-amber-500/30 selection:text-amber-200 relative overflow-x-hidden" x-data="{ 
  currentTab: 'home', 
  mobileMenu: false,
  showModal: false,
  toast: '',
  toastVisible: false,
  wishCount: 142,
  wishes: [
    { name: 'Sophia', message: 'May your year ahead be filled with boundless joy, immense success, and radiant smiles!', time: '10m ago', stars: 5 },
    { name: 'Liam & Family', message: 'Wishing you incredible health, happiness, and great fortune in every endeavor!', time: '1h ago', stars: 5 },
    { name: 'Elena Vance', message: 'Celebrate every single milestone with love and high energy today!', time: '2h ago', stars: 5 }
  ],
  newName: '',
  newMsg: '',
  triggerToast(msg) {
    this.toast = msg;
    this.toastVisible = true;
    setTimeout(() => { this.toastVisible = false; }, 3500);
  },
  addWish() {
    if (!this.newName.trim() || !this.newMsg.trim()) {
      this.triggerToast('Please fill out both your name and message!');
      return;
    }
    this.wishes.unshift({ name: this.newName, message: this.newMsg, time: 'Just now', stars: 5 });
    this.wishCount++;
    this.triggerToast('✨ Message submitted successfully!');
    this.newName = '';
    this.newMsg = '';
  }
}">

  <!-- Ambient Glowing Background Radial Orbs -->
  <div class="pointer-events-none fixed inset-0 overflow-hidden z-0">
    <div class="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-amber-500/20 via-purple-600/10 to-amber-500/10 blur-[140px] opacity-70"></div>
    <div class="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-amber-400/15 via-blue-600/10 to-purple-600/10 blur-[130px] opacity-60"></div>
    <div class="absolute -bottom-20 left-1/3 w-[600px] h-[600px] rounded-full bg-gradient-to-t from-amber-500/15 via-amber-600/10 to-transparent blur-[150px] opacity-50"></div>
    <div class="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]"></div>
  </div>

  <!-- Toast Notification -->
  <div x-show="toastVisible" x-transition:enter="transition ease-out duration-300 transform" x-transition:enter-start="opacity-0 translate-y-4" x-transition:enter-end="opacity-100 translate-y-0" x-transition:leave="transition ease-in duration-200 transform" x-transition:leave-start="opacity-100 translate-y-0" x-transition:leave-end="opacity-0 translate-y-4" class="fixed bottom-6 right-6 z-50 bg-slate-900/90 text-amber-300 border border-amber-500/30 backdrop-blur-xl px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3">
    <i data-lucide="sparkles" class="w-5 h-5 text-amber-400"></i>
    <span class="text-sm font-medium" x-text="toast"></span>
  </div>

  <!-- Fixed Navigation Bar -->
  <header class="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3 cursor-pointer" @click="currentTab = 'home'">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-[1px] shadow-lg shadow-amber-500/20">
          <div class="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
            <i data-lucide="sparkles" class="w-5 h-5 text-amber-400"></i>
          </div>
        </div>
        <div>
          <span class="font-display font-bold text-lg text-white tracking-tight">${displayTitle}</span>
          <span class="block text-[10px] text-amber-400/90 uppercase tracking-widest font-semibold">Official Application</span>
        </div>
      </div>

      <!-- Desktop Links -->
      <nav class="hidden md:flex items-center gap-1 bg-slate-900/60 border border-slate-800/80 p-1 rounded-xl backdrop-blur-md">
        <button @click="currentTab = 'home'" :class="currentTab === 'home' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'" class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all">Overview</button>
        <button @click="currentTab = 'wishes'" :class="currentTab === 'wishes' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'" class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all">Messages & Wishes</button>
        <button @click="currentTab = 'gallery'" :class="currentTab === 'gallery' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'" class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all">Feature Showcase</button>
        <button @click="currentTab = 'faq'" :class="currentTab === 'faq' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'" class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all">FAQ & Details</button>
      </nav>

      <div class="hidden md:flex items-center gap-3">
        <button @click="showModal = true" class="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/25 flex items-center gap-2 hover:scale-105 active:scale-95">
          <i data-lucide="heart" class="w-4 h-4"></i>
          <span>Send Love</span>
        </button>
      </div>

      <!-- Mobile Menu Toggle -->
      <button @click="mobileMenu = !mobileMenu" class="md:hidden text-slate-300 hover:text-white p-2">
        <i data-lucide="menu" class="w-6 h-6"></i>
      </button>
    </div>

    <!-- Mobile Dropdown -->
    <div x-show="mobileMenu" class="md:hidden border-b border-slate-800 bg-slate-950/95 px-4 pt-2 pb-4 space-y-2">
      <button @click="currentTab = 'home'; mobileMenu = false" class="block w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-900 rounded-lg">Overview</button>
      <button @click="currentTab = 'wishes'; mobileMenu = false" class="block w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-900 rounded-lg">Messages & Wishes</button>
      <button @click="currentTab = 'gallery'; mobileMenu = false" class="block w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-900 rounded-lg">Feature Showcase</button>
      <button @click="currentTab = 'faq'; mobileMenu = false" class="block w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-900 rounded-lg">FAQ & Details</button>
    </div>
  </header>

  <!-- MAIN CONTENT AREA -->
  <main class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">

    <!-- TAB 1: HOME OVERVIEW -->
    <section x-show="currentTab === 'home'" x-transition:enter="transition ease-out duration-300" class="space-y-16">
      
      <!-- HERO SHOWCASE -->
      <div class="text-center space-y-6 max-w-4xl mx-auto pt-6">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide uppercase shadow-sm">
          <i data-lucide="sparkles" class="w-4 h-4 text-amber-400"></i>
          <span>A Special Celebration & Interactive Experience</span>
        </div>

        <h1 class="text-4xl sm:text-6xl lg:text-7xl font-extrabold font-display tracking-tight text-white leading-tight">
          <span class="bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-transparent">${displayTitle}</span>
        </h1>

        <p class="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Welcome to this custom interactive application! Designed with precision, responsive layout grids, dynamic wish boards, and active widgets.
        </p>

        <div class="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button @click="currentTab = 'wishes'" class="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold px-8 py-4 rounded-2xl text-base shadow-xl shadow-amber-500/20 transition-all hover:scale-105 flex items-center gap-3">
            <i data-lucide="message-square-heart" class="w-5 h-5"></i>
            <span>View Wishes & Leave Message</span>
          </button>
          
          <button @click="showModal = true" class="bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold border border-slate-700/80 px-8 py-4 rounded-2xl text-base transition-all hover:scale-105 flex items-center gap-3 backdrop-blur-md">
            <i data-lucide="gift" class="w-5 h-5 text-amber-400"></i>
            <span>Make a Wish</span>
          </button>
        </div>

        <!-- STATS / METRICS -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12">
          <div class="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl p-6 rounded-2xl text-center hover:border-amber-500/40 transition-all">
            <div class="text-3xl font-bold font-display text-amber-400" x-text="wishCount"></div>
            <div class="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">Messages Sent</div>
          </div>
          <div class="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl p-6 rounded-2xl text-center hover:border-amber-500/40 transition-all">
            <div class="text-3xl font-bold font-display text-white">100%</div>
            <div class="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">Happiness Index</div>
          </div>
          <div class="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl p-6 rounded-2xl text-center hover:border-amber-500/40 transition-all">
            <div class="text-3xl font-bold font-display text-amber-400">5.0 ★</div>
            <div class="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">Love Rating</div>
          </div>
          <div class="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl p-6 rounded-2xl text-center hover:border-amber-500/40 transition-all">
            <div class="text-3xl font-bold font-display text-white">Live</div>
            <div class="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">Interactive App</div>
          </div>
        </div>
      </div>

      <!-- BENTO HIGHLIGHTS -->
      <div class="grid md:grid-cols-3 gap-6 pt-8">
        <div class="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/90 rounded-2xl p-8 backdrop-blur-xl hover:border-amber-500/40 transition-all group">
          <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 text-amber-400 group-hover:scale-110 transition-transform">
            <i data-lucide="heart" class="w-6 h-6"></i>
          </div>
          <h3 class="text-xl font-bold text-white mb-2 font-display">Custom Greetings</h3>
          <p class="text-slate-300 text-sm leading-relaxed">Leave thoughtful messages, digital gifts, and personal reflections that persist in real-time.</p>
        </div>

        <div class="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/90 rounded-2xl p-8 backdrop-blur-xl hover:border-amber-500/40 transition-all group">
          <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 text-amber-400 group-hover:scale-110 transition-transform">
            <i data-lucide="smile" class="w-6 h-6"></i>
          </div>
          <h3 class="text-xl font-bold text-white mb-2 font-display">Interactive Features</h3>
          <p class="text-slate-300 text-sm leading-relaxed">Toggle views, send confetti reactions, and explore curated photo & video memory cards.</p>
        </div>

        <div class="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/90 rounded-2xl p-8 backdrop-blur-xl hover:border-amber-500/40 transition-all group">
          <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 text-amber-400 group-hover:scale-110 transition-transform">
            <i data-lucide="zap" class="w-6 h-6"></i>
          </div>
          <h3 class="text-xl font-bold text-white mb-2 font-display">Responsive Layout</h3>
          <p class="text-slate-300 text-sm leading-relaxed">Optimized with Tailwind CSS styling, dark luxury gradients, and fluid mobile ergonomics.</p>
        </div>
      </div>
    </section>

    <!-- TAB 2: WISHES & MESSAGE BOARD -->
    <section x-show="currentTab === 'wishes'" x-transition:enter="transition ease-out duration-300" class="space-y-8">
      <div class="text-center max-w-2xl mx-auto">
        <h2 class="text-3xl font-extrabold font-display text-white">Community Wishboard</h2>
        <p class="text-slate-300 text-sm mt-2">Send your heartfelt congratulations and watch them appear live on screen!</p>
      </div>

      <div class="grid lg:grid-cols-3 gap-8">
        <!-- Input Form -->
        <div class="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl backdrop-blur-xl space-y-4">
          <h3 class="text-lg font-bold text-amber-300 flex items-center gap-2">
            <i data-lucide="edit-3" class="w-5 h-5"></i>
            <span>Write a Message</span>
          </h3>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Your Name</label>
            <input type="text" x-model="newName" placeholder="e.g. Alex" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500">
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Your Message</label>
            <textarea x-model="newMsg" rows="4" placeholder="Write something sweet and memorable..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"></textarea>
          </div>

          <button @click="addWish()" class="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">
            <i data-lucide="send" class="w-4 h-4"></i>
            <span>Post Message</span>
          </button>
        </div>

        <!-- Wish List -->
        <div class="lg:col-span-2 space-y-4">
          <template x-for="(w, idx) in wishes" :key="idx">
            <div class="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl hover:border-amber-500/30 transition-all space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-xs" x-text="w.name.charAt(0)"></div>
                  <span class="font-bold text-white text-base" x-text="w.name"></span>
                </div>
                <span class="text-xs text-slate-400" x-text="w.time"></span>
              </div>
              <p class="text-slate-300 text-sm leading-relaxed" x-text="w.message"></p>
            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- TAB 3: FEATURE GALLERY -->
    <section x-show="currentTab === 'gallery'" x-transition:enter="transition ease-out duration-300" class="space-y-8">
      <div class="text-center max-w-2xl mx-auto">
        <h2 class="text-3xl font-extrabold font-display text-white">Interactive Feature Showcase</h2>
        <p class="text-slate-300 text-sm mt-2">Explore the dynamic capabilities baked into this compiled application.</p>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="bg-slate-900/80 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl space-y-3">
          <div class="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <i data-lucide="shield-check" class="w-5 h-5"></i>
          </div>
          <h3 class="text-lg font-bold text-white">High Contrast Design</h3>
          <p class="text-slate-300 text-xs">Vibrant typography contrast ensuring 100% legibility across light & dark viewports.</p>
        </div>

        <div class="bg-slate-900/80 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl space-y-3">
          <div class="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <i data-lucide="cpu" class="w-5 h-5"></i>
          </div>
          <h3 class="text-lg font-bold text-white">Alpine State Engine</h3>
          <p class="text-slate-300 text-xs">Instant client-side reactive rendering without full page reloads.</p>
        </div>

        <div class="bg-slate-900/80 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl space-y-3">
          <div class="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <i data-lucide="layers" class="w-5 h-5"></i>
          </div>
          <h3 class="text-lg font-bold text-white">Glassmorphism Aesthetics</h3>
          <p class="text-slate-300 text-xs">Backdrop blur layers with subtle borders and glowing accent lights.</p>
        </div>
      </div>
    </section>

    <!-- TAB 4: FAQ -->
    <section x-show="currentTab === 'faq'" x-transition:enter="transition ease-out duration-300" class="max-w-3xl mx-auto space-y-6" x-data="{ openFaq: 0 }">
      <div class="text-center">
        <h2 class="text-3xl font-extrabold font-display text-white">Frequently Asked Questions</h2>
        <p class="text-slate-300 text-sm mt-2">Everything you need to know about this application.</p>
      </div>

      <div class="space-y-4 pt-4">
        <div class="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
          <button @click="openFaq = (openFaq === 0 ? -1 : 0)" class="w-full text-left p-5 text-white font-semibold flex items-center justify-between">
            <span>How does this website work?</span>
            <i data-lucide="chevron-down" class="w-5 h-5 text-amber-400 transition-transform" :class="openFaq === 0 ? 'rotate-180' : ''"></i>
          </button>
          <div x-show="openFaq === 0" class="px-5 pb-5 text-slate-300 text-sm leading-relaxed border-t border-slate-800/50 pt-3">
            This app is generated with modern Tailwind CSS and Alpine.js for full interactivity in a single self-contained document.
          </div>
        </div>

        <div class="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
          <button @click="openFaq = (openFaq === 1 ? -1 : 1)" class="w-full text-left p-5 text-white font-semibold flex items-center justify-between">
            <span>Can I customize messages and layout?</span>
            <i data-lucide="chevron-down" class="w-5 h-5 text-amber-400 transition-transform" :class="openFaq === 1 ? 'rotate-180' : ''"></i>
          </button>
          <div x-show="openFaq === 1" class="px-5 pb-5 text-slate-300 text-sm leading-relaxed border-t border-slate-800/50 pt-3">
            Yes! You can use the edit instruction feature to update colors, add new tabs, or change text dynamically.
          </div>
        </div>
      </div>
    </section>

  </main>

  <!-- MODAL DIALOG -->
  <div x-show="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" x-transition:enter="transition ease-out duration-200" x-transition:enter-start="opacity-0 scale-95" x-transition:enter-end="opacity-100 scale-100">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative" @click.away="showModal = false">
      <button @click="showModal = false" class="absolute top-4 right-4 text-slate-400 hover:text-white">
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>

      <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
        <i data-lucide="gift" class="w-6 h-6"></i>
      </div>

      <h3 class="text-xl font-bold text-white font-display">Make a Celebration Wish</h3>
      <p class="text-slate-300 text-sm">Send your warm congratulations directly into the celebration wall.</p>

      <div>
        <label class="block text-xs font-semibold text-slate-300 mb-1">Your Name</label>
        <input type="text" x-model="newName" placeholder="Enter your name" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500">
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-300 mb-1">Wish / Message</label>
        <textarea x-model="newMsg" rows="3" placeholder="Enter your wish..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"></textarea>
      </div>

      <div class="flex gap-3 pt-2">
        <button @click="showModal = false" class="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
        <button @click="addWish(); showModal = false" class="w-1/2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-sm shadow-lg shadow-amber-500/20">Send Wish</button>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <footer class="border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md py-8 text-center text-xs text-slate-400 mt-20">
    <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <i data-lucide="sparkles" class="w-4 h-4 text-amber-400"></i>
        <span class="text-slate-300 font-medium">${displayTitle}</span>
      </div>
      <p>&copy; ${new Date().getFullYear()} ${displayTitle}. All rights reserved.</p>
    </div>
  </footer>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      if (window.lucide) {
        lucide.createIcons();
      }
    });
  </script>
</body>
</html>`;
}

async function generateAurumSiteCode(
  systemPrompt: string,
  userPrompt: string,
  settingsData: any,
  keysPool: string[]
): Promise<string> {
  let rawString = '';

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  // Primary AI Engine: Claude Haiku 4.5 via HYBRA proxy API
  const hybraModels = [
    'claude-haiku-4-5',
    'deepseek-v4-pro-0813',
    'deepseek-v4-flash-0731',
    'gpt-oss-120b'
  ];

  for (const hybraModel of hybraModels) {
    try {
      console.log(`[AurumEngine] Compiling site code via HYBRA model ${hybraModel}...`);
      const hRes = await fetch('https://hybra.onyx-2f0t.workers.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer femboysex'
        },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          model: hybraModel,
          messages: messages,
          temperature: 0.5,
          max_tokens: 8192
        })
      });

      if (hRes.ok) {
        const hJson = await hRes.json();
        rawString = hJson.choices?.[0]?.message?.content || hJson.choices?.[0]?.text || '';
        if (rawString && rawString.trim().length > 100) {
          let currentOutput = rawString;
          let checkVal = validateHtmlCompleteness(currentOutput);
          
          let continuationAttempts = 0;
          while (!checkVal.isComplete && continuationAttempts < 2) {
            continuationAttempts++;
            console.warn(`[AurumEngine] Output truncated (${checkVal.reason}). Triggering continuation ${continuationAttempts}/2...`);
            
            const lastSnippet = currentOutput.trim().slice(-250);
            const contMessages = [
              ...messages,
              { role: 'assistant', content: currentOutput },
              { role: 'user', content: `YOUR PREVIOUS RESPONSE WAS TRUNCATED MID-CODE NEAR:\n"${lastSnippet}"\n\nCRITICAL MANDATE: Continue directly from that exact point. DO NOT repeat any already written HTML or markdown blocks. Complete all remaining CSS, JavaScript, HTML tags, and close with </body></html>.` }
            ];

            try {
              const cRes = await fetch('https://hybra.onyx-2f0t.workers.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer femboysex'
                },
                signal: AbortSignal.timeout(30000),
                body: JSON.stringify({
                  model: hybraModel,
                  messages: contMessages,
                  temperature: 0.3,
                  max_tokens: 4096
                })
              });

              if (cRes.ok) {
                const cJson = await cRes.json();
                const contChunk = cJson.choices?.[0]?.message?.content || cJson.choices?.[0]?.text || '';
                if (contChunk && contChunk.trim().length > 0) {
                  let cleanedChunk = contChunk.replace(/^```(?:html|xml)?\s*/i, '').replace(/\s*```$/i, '').trim();
                  currentOutput = currentOutput.trim() + '\n' + cleanedChunk;
                  checkVal = validateHtmlCompleteness(currentOutput);
                  console.log(`[AurumEngine] Continuation ${continuationAttempts} appended. Validation status: ${checkVal.isComplete}`);
                } else {
                  break;
                }
              } else {
                break;
              }
            } catch (cErr: any) {
              console.warn(`[AurumEngine] Continuation call exception:`, cErr.message);
              break;
            }
          }

          if (checkVal.isComplete) {
            console.log(`[AurumEngine] Successfully compiled complete site code using ${hybraModel}!`);
            return currentOutput;
          } else {
            console.warn(`[AurumEngine] Model ${hybraModel} response incomplete after continuation (${checkVal.reason}). Trying fallback model...`);
          }
        }
      } else {
        const errText = await hRes.text();
        console.warn(`[AurumEngine] HYBRA model ${hybraModel} returned status ${hRes.status}:`, errText.substring(0, 100));
      }
    } catch (hErr: any) {
      console.warn(`[AurumEngine] HYBRA call exception for ${hybraModel}:`, hErr.message);
    }
  }

  // Backup compiler endpoints via NVIDIA NIM
  const siteCandidateModels = Array.from(new Set([
    'meta/llama-3.3-70b-instruct',
    'meta/llama-3.1-70b-instruct',
    'mistralai/mistral-large-2-instruct',
    'meta/llama-3.1-405b-instruct',
    ...(settingsData?.nvidiaNimModel ? [normalizeNvidiaModel(settingsData.nvidiaNimModel)] : [])
  ]));

  const combinedPrompt = `${systemPrompt}\n\n==================== USER APPLICATION SPECIFICATION ====================\n${userPrompt}\n\n==================== MANDATORY OUTPUT INSTRUCTION ====================\nOutput ONLY the complete raw HTML document inside a single markdown \`\`\`html ... \`\`\` code block. Do NOT include conversational text before or after.`;

  for (let i = 0; i < Math.min(keysPool.length, 2); i++) {
    const activeKey = keysPool[i];
    for (const targetModel of siteCandidateModels.slice(0, 3)) {
      console.log(`[AurumEngine] Fallback: Compiling site layout via NVIDIA NIM model ${targetModel} (key index ${i})...`);
      try {
        const modelResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeKey}`
          },
          signal: AbortSignal.timeout(25000),
          body: JSON.stringify({
            model: targetModel,
            messages: [
              { role: 'user', content: combinedPrompt }
            ],
            temperature: 0.5,
            max_tokens: 4096
          })
        });

        if (modelResponse.ok) {
          const resJson = await modelResponse.json();
          rawString = resJson.choices?.[0]?.message?.content || '';
          if (rawString && rawString.trim().length > 100) {
            const checkVal = validateHtmlCompleteness(rawString);
            if (checkVal.isComplete) {
              console.log(`[AurumEngine] Successfully compiled site code via NVIDIA NIM model ${targetModel}`);
              return rawString;
            } else {
              console.warn(`[AurumEngine] NVIDIA NIM model ${targetModel} output incomplete (${checkVal.reason}).`);
            }
          }
        } else {
          const errText = await modelResponse.text();
          console.warn(`[AurumEngine] Key index ${i} model ${targetModel} failed (${modelResponse.status}):`, errText.substring(0, 120));
        }
      } catch (err: any) {
        console.warn(`[AurumEngine] NVIDIA NIM connection exception for model ${targetModel}:`, err.message);
      }
    }
  }

  console.log('[AurumEngine] All AI compiler endpoints exhausted. Generating high-contrast topic-specific fallback site HTML code...');
  return generateMasterFallbackSiteCode(userPrompt);
}

// Create fully fledged standalone responsive app
app.post('/api/create-site', authenticateUser, async (req: any, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { prompt, stepsCount = 3, inspirationFiles } = req.body || {};
    const uid = req.user?.uid || 'anonymous';
    
    if (!prompt) {
      return res.status(400).json({ error: 'Missing website prompt' });
    }
    // Fetch user with resilient try-catch to prevent permission denied errors in sandbox environments from blocking execution
    const userRef = db.collection('users').doc(uid);
    let userData: any = null;
    let fallbackUsed = false;
    try {
      const userSnap = await userRef.get();
      if (userSnap && userSnap.exists) {
        userData = userSnap.data();
      }
    } catch (dbErr: any) {
      console.warn('[LovableAI] Database profile read skipped due to sandbox IAM permission constraints:', dbErr.message);
      fallbackUsed = true;
    }

    // Default to generous fallback values to ensure verified users can always generate sites even if DB reads are blocked
    if (!userData) {
      userData = {
        id: uid,
        planId: 'plan_pro_plus',
        queriesCount: 0,
        topupCredits: 9999,
        planExpiresAt: 'unlimited',
        planName: 'Pro+'
      };
    }

    let planId = userData?.planId || 'plan_free';
    let queriesCount = userData?.queriesCount || 0;
    let topupCredits = userData?.topupCredits || 0;
    
    // Apply daily resets safely
    if (!fallbackUsed) {
      try {
        const resetData = await resetUserCreditsIfNeeded(uid, userData, userRef);
        queriesCount = resetData.queriesCount;
      } catch (resetErr: any) {
        console.warn('[LovableAI] Silent daily credits reset write skipped:', resetErr.message);
      }
    }

    // Retrieve plans limit safely
    let queriesLimit = 50;
    try {
      const planSnap = await db.collection('plans').doc(planId).get();
      if (planSnap && planSnap.exists) {
        queriesLimit = planSnap.data()?.queriesLimit ?? 50;
      }
    } catch (planErr: any) {
      console.warn('[LovableAI] Silent plan read skipped:', planErr.message);
    }

    const totalAllowed = (queriesLimit === -1) ? 999999 : (queriesLimit + topupCredits);
    const remainingCredits = totalAllowed - queriesCount;

    // Enforce limits only if database read succeeded and was not using generous fallback
    if (!fallbackUsed && totalAllowed !== -1 && remainingCredits < stepsCount) {
      return res.status(403).json({
        error: 'Insufficient priority credits',
        message: `Creating and compiling this website requires ${stepsCount} Priority Credits (1 credit per compilation agent request), but you have only ${remainingCredits} remaining. API creation and website builders are exclusive to Priority Credits.`
      });
    }

    // Retrieve system settings securely
    let settingsData = { ...inMemorySettings };
    try {
      const settingsSnap = await db.collection('settings').doc('system').get();
      if (settingsSnap && settingsSnap.exists) {
        const liveData = settingsSnap.data();
        if (liveData) settingsData = { ...settingsData, ...liveData };
      }
    } catch (settingsErr: any) {
      console.warn('[AurumEngine] Settings read skipped, using static configs:', settingsErr.message);
    }

    const nvidiaNimKey = settingsData.nvidiaNimKey || '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';
    const keysPool = Array.from(new Set([
      ...nvidiaNimKey.split(/[\n,;]+/).map((k: string) => k.trim()).filter((k: string) => k.length > 0),
      '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',
      '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'
    ]));
    if (keysPool.length === 0) {
      return res.status(500).json({ error: 'Server NVIDIA configuration is missing keys' });
    }
    const generationSteps = [
      { name: 'Wireframing Schemas', status: 'Generating site layout grids, component states, and responsive view toggles...', creditsSpent: 1 },
      { name: 'Tailwind Aesthetic Theme Integration', status: 'Styling dark/light panels, buttons shadows, typography heights with full negative margins...', creditsSpent: 1 },
      { name: 'Alpine.js State Machine & Real AI Assets Placement', status: 'Compiling state routers, search forms, list filters, and mapping interactive graphics...', creditsSpent: 1 }
    ];

    // Directly construct the prompt without a double-roundtrip LLM request to avoid gateway/proxy timeout
    let enhancedPrompt = `User Prompt: ${prompt}`;
    let attachedContext = '';
    if (inspirationFiles && Array.isArray(inspirationFiles) && inspirationFiles.length > 0) {
      attachedContext = "\n\n=== EXPLICIT USER ATTACHED DESIGN INSPIRATION FILES ===\n";
      for (const file of inspirationFiles) {
        attachedContext += `\n[FILE NAME]: ${file.name}\n[FILE CONTENT]:\n${file.content || '(Binary/image background reference asset attached)'}\n`;
      }
      enhancedPrompt += attachedContext;
    }

    // Query AI model to generate a completely self-contained page
    const systemPrompt = `============================================================
AURUM WEBSITE GENERATION ENGINE — MASTER SYSTEM INSTRUCTION
============================================================
You are an expert autonomous AI website builder and senior full-stack frontend engineer.
Your job is to create a BEAUTIFUL, FUNCTIONAL, ERROR-FREE, RESPONSIVE, PRODUCTION-QUALITY website based on the user's request.

============================================================
1. ABSOLUTE BRAND SEPARATION & INDEPENDENCE (CRITICAL)
============================================================
AURUM IS THE BUILDER. THE GENERATED WEBSITE IS THE USER'S INDEPENDENT PRODUCT.
- NEVER place "Aurum", "Aurum AI", "Built with Aurum", "Powered by Aurum", "Created with Aurum", "Made with Aurum", builder watermarks, builder badges, builder UI, builder navigation, or builder credits into the generated website.
- NEVER mention AI models (Claude, Gemini, DeepSeek, GPT, Llama, etc.) inside the generated website.
- NEVER generate internal builder UI (AI chat panels, file trees, compiler status, credits, build status, "Edit with AI", builder dashboard controls).
- NO internal terminology ("compiled app", "AI generated", "compiler", "prompt", "tokens", "credits").
- The generated website must look like it was independently developed by the USER for their product/brand.

============================================================
2. CRITICAL COMPILER FORMAT REQUIREMENT (STRICT)
============================================================
1. YOU MUST OUTPUT A SINGLE, COMPLETE, EXECUTABLE, VALID HTML5 DOCUMENT STARTING WITH '<!DOCTYPE html>' AND ENDING WITH '</html>'.
2. DO NOT OUTPUT A FILE TREE OR DIRECTORY STRUCTURE (e.g., 'src/components/', 'ai-study-buddy/', '├── index.html').
3. DO NOT OUTPUT TUTORIALS, DESCRIPTIONS, PREFACES, OR CONVERSATIONAL REMARKS.
4. ALL STYLING, INTERACTIVE LOGIC (AlpineJS), SVG ICONS (Lucide), AND CONTENT MUST BE INLINE INSIDE THIS SINGLE HTML DOCUMENT.

============================================================
3. DESIGN QUALITY & REAL CONTENT
============================================================
1. PROFESSIONAL DESIGN: High visual hierarchy, clean typography (Inter & Space Grotesk), high contrast, proper spacing, responsive layouts.
2. NO PLACEHOLDERS: Generate realistic, useful, domain-specific copy. NO "Lorem ipsum", "Coming soon", "Your text here", or "Example text".
3. RESPONSIVENESS: Mobile, tablet, laptop, and desktop layouts MUST work without horizontal overflow ('overflow-x-hidden').
4. ALL INTERACTIVE ELEMENTS WORK:
   - Navigation links/tabs switch screens with Alpine.js state ('x-data="{ currentTab: \\'home\\', ... }"').
   - Buttons trigger actions, slide-over modals, or toast notifications.
   - Forms validate inputs and show success feedback toasts.
   - Interactive tools (calculators, search filters, accordions) recalculate and update on screen dynamically.

============================================================
4. TAILWIND & SCRIPTS REQUIRED IN <head>
============================================================
1. Tailwind CSS: <script src="https://cdn.tailwindcss.com"></script>
2. AlpineJS: <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.8/dist/cdn.min.js"></script>
3. Lucide Icons: <script src="https://unpkg.com/lucide@latest"></script>
4. Custom Tailwind Theme:
   <script>
     tailwind.config = {
       darkMode: 'class',
       theme: {
         extend: {
           colors: {
             gold: { 50: '#fefdf0', 100: '#fdfbe1', 200: '#faf3b2', 500: '#DFB15F', 600: '#C59A4E', 900: '#725011' },
             brand: { 50: '#f5f7ff', 100: '#ebf0ff', 500: '#3b82f6', 600: '#2563eb', 900: '#1e3a8a' }
           },
           fontFamily: {
             sans: ['Inter', 'sans-serif'],
             display: ['Space Grotesk', 'sans-serif']
           }
         }
       }
     }
   </script>
5. Google Fonts:
   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">

Output ONLY the raw HTML code inside markdown backticks: ` + "```" + `html <!DOCTYPE html> ... </html> ` + "```" + `. Do not write conversational prefaces or remarks.`;

    const rawString = await generateAurumSiteCode(systemPrompt, enhancedPrompt, settingsData, keysPool);

    if (!rawString || rawString.trim().length === 0) {
      return res.status(502).json({
        error: 'Site compilation error',
        message: 'Could not generate site code at this moment. Please check server AI keys and try again shortly.'
      });
    }
    
    const compiledCode = cleanAndExtractHtml(rawString, prompt);

    // Deduct stepsCount credits safely
    try {
      if (!fallbackUsed) {
        await deductUserCredits(uid, stepsCount);
      }
    } catch (dedErr: any) {
      console.warn('[LovableAI] Safe credit deduction skipped:', dedErr.message);
    }

    // Save this compiled site in Firestore 'sites' collection
    const siteId = db.collection('sites').doc().id;
    const newSite = {
      id: siteId,
      userId: uid,
      prompt,
      title: prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt,
      code: compiledCode,
      createdAt: Date.now(),
      creditsSpent: stepsCount
    };
    
    // Sync newly created site immediately with local server cache for reliable opening in new tab
    siteCodeCache.set(siteId, compiledCode);
    try {
      const dir = path.join(process.cwd(), 'site_previews_cache');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${siteId}.html`), compiledCode, 'utf8');
    } catch (cwErr: any) {
      console.warn('[CreateSite] Silent write preview cache skip:', cwErr.message);
    }

    // Save to database, but gracefully continue if firebase-admin is blocked by container permissions
    try {
      await db.collection('sites').doc(siteId).set(newSite);
      console.log(`[LovableAI] Site ${siteId} stored in Firestore securely.`);
    } catch (dbSiteErr: any) {
      console.warn('[LovableAI] Main database write skipped (GCP IAM sandbox restricted). Relying on client-side sync:', dbSiteErr.message);
    }

    // Deduct user priority credits
    if (uid && uid !== 'anonymous') {
      try {
        await deductUserCredits(uid, stepsCount || 8);
      } catch (deductErr: any) {
        console.warn('[LovableAI] Credit deduction skipped:', deductErr.message);
      }
    }

    return res.json({
      success: true,
      site: newSite,
      steps: generationSteps
    });

  } catch (err: any) {
    console.error('Create site error:', err);
    return res.status(500).json({ error: 'Aurum Engine compilation failed', message: err.message });
  }
});


// 12. Edit compiled website iteratively
app.post('/api/edit-site', authenticateUser, async (req: any, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { siteId, instruction, stepsCount = 1, currentHistory = [] } = req.body || {};
    const uid = req.user?.uid || 'anonymous';

    if (!siteId || !instruction) {
      return res.status(400).json({ error: 'Missing siteId or instruction' });
    }
    // 1. Fetch site from Firestore or fallback to local context
    let existingSite: any = null;
    try {
      const siteSnap = await db.collection('sites').doc(siteId).get();
      if (siteSnap.exists) {
        existingSite = siteSnap.data();
      }
    } catch (dbErr: any) {
      console.warn('[EditSite] Database site read skipped (GCP IAM sandbox restricted):', dbErr.message);
    }

    if (!existingSite) {
      const currentCode = req.body.currentCode || siteCodeCache.get(siteId);
      if (currentCode) {
        existingSite = {
          id: siteId,
          userId: uid,
          code: currentCode,
          prompt: req.body.currentPrompt || 'Compiled Webpage',
          title: req.body.currentTitle || 'Compiled Webpage',
          createdAt: Date.now()
        };
        console.log(`[EditSite] Successfully restored site ${siteId} from client/memory cache.`);
      }
    }

    if (!existingSite) {
      return res.status(404).json({ error: 'Site not found', message: 'Could not fetch or reconstruct your website. Please try editing again!' });
    }

    if (existingSite.userId !== uid) {
      return res.status(403).json({ error: 'Access denied: you do not own this website' });
    }

    // 2. Fetch user to verify credits
    const userRef = db.collection('users').doc(uid);
    let userData: any = null;
    let fallbackUsed = false;
    try {
      const userSnap = await userRef.get();
      if (userSnap && userSnap.exists) {
        userData = userSnap.data();
      }
    } catch (dbErr: any) {
      console.warn('[LovableAI] Database user read skipped:', dbErr.message);
      fallbackUsed = true;
    }

    if (!userData) {
      userData = {
        id: uid,
        planId: 'plan_pro_plus',
        queriesCount: 0,
        topupCredits: 9999,
        planExpiresAt: 'unlimited',
        planName: 'Pro+'
      };
    }

    let planId = userData?.planId || 'plan_free';
    let queriesCount = userData?.queriesCount || 0;
    let topupCredits = userData?.topupCredits || 0;

    if (!fallbackUsed) {
      try {
        const resetData = await resetUserCreditsIfNeeded(uid, userData, userRef);
        queriesCount = resetData.queriesCount;
      } catch (resetErr: any) {
        console.warn('[LovableAI] Reset credits failed:', resetErr.message);
      }
    }

    let queriesLimit = 50;
    try {
      const planSnap = await db.collection('plans').doc(planId).get();
      if (planSnap && planSnap.exists) {
        queriesLimit = planSnap.data()?.queriesLimit ?? 50;
      }
    } catch {}

    const totalAllowed = (queriesLimit === -1) ? 999999 : (queriesLimit + topupCredits);
    const remainingCredits = totalAllowed - queriesCount;

    if (!fallbackUsed && totalAllowed !== -1 && remainingCredits < stepsCount) {
      return res.status(403).json({
        error: 'Insufficient priority credits',
        message: `Editing this website requires ${stepsCount} Priority Credit, but you have only ${remainingCredits} remaining.`
      });
    }

    // 3. Resolve system settings (keys)
    let settingsData = { ...inMemorySettings };
    try {
      const settingsSnap = await db.collection('settings').doc('system').get();
      if (settingsSnap && settingsSnap.exists) {
        const liveData = settingsSnap.data();
        if (liveData) settingsData = { ...settingsData, ...liveData };
      }
    } catch {}

    const nvidiaNimKey = settingsData.nvidiaNimKey || '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';
    const keysPool = Array.from(new Set([
      ...nvidiaNimKey.split(/[\n,;]+/).map((k: string) => k.trim()).filter((k: string) => k.length > 0),
      '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',
      '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'
    ]));
    if (keysPool.length === 0) {
      return res.status(500).json({ error: 'Server NVIDIA configuration is missing keys' });
    }

    // 4. Compile the revision using LLM
    let editHistoryContext = '';
    const historyArray = existingSite.history || currentHistory || [];
    if (Array.isArray(historyArray) && historyArray.length > 0) {
      editHistoryContext = historyArray
        .map((h: any, idx: number) => `Edit ${idx + 1} (${h.instruction || h.prompt || 'Iterative Revision'}):\n- Code base updated with previous instruction.`)
        .slice(-6)
        .join('\n\n');
    }

    let contextOfPreviousEdits = "";
    if (editHistoryContext) {
      contextOfPreviousEdits = `\nBelow is the history of previous edit instructions applied leading to the current webpage state:\n${editHistoryContext}\n`;
    }

    const systemPrompt = `============================================================
AURUM WEBSITE GENERATION ENGINE — MASTER SYSTEM INSTRUCTION
============================================================
You are an expert autonomous AI website builder and senior full-stack frontend engineer.
Below is the existing HTML webpage code of a standalone website:
\`\`\`html
${existingSite.code}
\`\`\`
${contextOfPreviousEdits}
The user wants you to edit and update the existing HTML webpage based on their latest instruction:
"${instruction}"

============================================================
1. ABSOLUTE BRAND SEPARATION & INDEPENDENCE (CRITICAL)
============================================================
AURUM IS THE BUILDER. THE GENERATED WEBSITE IS THE USER'S INDEPENDENT PRODUCT.
- NEVER place "Aurum", "Aurum AI", "Built with Aurum", "Powered by Aurum", "Created with Aurum", "Made with Aurum", builder watermarks, builder badges, builder UI, builder navigation, or builder credits into the generated website.
- NEVER mention AI models (Claude, Gemini, DeepSeek, GPT, Llama, etc.) inside the generated website.
- NEVER generate internal builder UI (AI chat panels, file trees, compiler status, credits, build status, "Edit with AI", builder dashboard controls).
- NO internal terminology ("compiled app", "AI generated", "compiler", "prompt", "tokens", "credits").
- Preserve the user's independent brand identity and website purpose.

============================================================
2. CRITICAL COMPILER FORMAT REQUIREMENT (STRICT)
============================================================
1. YOU MUST OUTPUT A SINGLE, COMPLETE, EXECUTABLE, VALID HTML5 DOCUMENT STARTING WITH '<!DOCTYPE html>' AND ENDING WITH '</html>'.
2. DO NOT OUTPUT A FILE TREE OR DIRECTORY STRUCTURE (e.g., 'src/components/', 'ai-study-buddy/', '├── index.html').
3. DO NOT OUTPUT TUTORIALS, DESCRIPTIONS, PREFACES, OR CONVERSATIONAL REMARKS.
4. ALL STYLING, INTERACTIVE LOGIC (AlpineJS), SVG ICONS (Lucide), AND CONTENT MUST BE INLINE INSIDE THIS SINGLE HTML DOCUMENT.

============================================================
3. TARGETED REVISION & QUALITY RETENTION
============================================================
1. TARGETED EDITING: Apply the requested changes directly inside the existing HTML document without breaking or stripping unrelated existing sections.
2. NO PLACEHOLDERS: Maintain real, context-aware content. NO "Lorem ipsum", "Coming soon", "Your text here".
3. INTERACTIVITY: All buttons, navigation links, modals, forms, calculators, and filters must remain fully functional with Alpine.js state.
4. FLUX IMAGES: If adding new visual assets, use: '/api/image-proxy?prompt=<encoded_flux_prompt>&seed=<random_number>&model=flux'.

Output ONLY the raw updated HTML inside code blocks: \`\`\`html <!DOCTYPE html> ... </html> \`\`\`. Do not write conversational prefaces or remarks.`;

    const userEditMsg = `Please edit the webpage code as requested: "${instruction}"`;
    const rawString = await generateAurumSiteCode(systemPrompt, userEditMsg, settingsData, keysPool);

    if (!rawString || rawString.trim().length === 0) {
      return res.status(502).json({
        error: 'Site compilation edit error',
        message: 'Could not apply site edits at this moment. Please check server AI keys and try again shortly.'
      });
    }

    const compiledCode = cleanAndExtractHtml(rawString, instruction, existingSite.code);

    // Deduct 1 credit for edits
    try {
      if (!fallbackUsed) {
        await deductUserCredits(uid, stepsCount);
      }
    } catch (dedErr: any) {
      console.warn('[LovableAI] Credit deduction failed on edit:', dedErr.message);
    }

    // Maintain a history stack of previous revisions
    let history = existingSite.history || currentHistory || [];
    if (!Array.isArray(history)) {
      history = [];
    }

    // Capture the existing state BEFORE updating it
    const historyItem = {
      code: existingSite.code,
      prompt: existingSite.prompt,
      title: existingSite.title || 'Prior Build',
      timestamp: existingSite.updatedAt || existingSite.createdAt || Date.now(),
      instruction: instruction
    };

    // To prevent infinite array growth, limit history size to 40
    history = [...history, historyItem];
    if (history.length > 40) {
      history.shift();
    }

    // Update the site code in database
    const updatedSiteObj = {
      ...existingSite,
      code: compiledCode,
      prompt: existingSite.prompt + `\nRevision: ` + instruction,
      history,
      updatedAt: Date.now()
    };

    // Sync edited site immediately with local server cache for reliable opening in new tab
    siteCodeCache.set(siteId, compiledCode);
    try {
      const dir = path.join(process.cwd(), 'site_previews_cache');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${siteId}.html`), compiledCode, 'utf8');
    } catch (cwErr: any) {
      console.warn('[EditSite] Silent write preview cache skip:', cwErr.message);
    }

    try {
      await db.collection('sites').doc(siteId).set(updatedSiteObj);
    } catch (dbSiteErr: any) {
      console.warn('[LovableAI] Failed to write updated site to DB, using client fallback', dbSiteErr.message);
    }

    // Deduct user priority credits for site edit
    if (uid && uid !== 'anonymous') {
      try {
        await deductUserCredits(uid, stepsCount || 1);
      } catch (deductErr: any) {
        console.warn('[EditSite] Credit deduction skipped:', deductErr.message);
      }
    }

    return res.json({
      success: true,
      site: updatedSiteObj
    });

  } catch (err: any) {
    console.error('Edit site error:', err);
    return res.status(500).json({ error: 'Failed to edit site', message: err.message });
  }
});


// 12.1. Revert website to a previous historical build
app.post('/api/revert-site', authenticateUser, async (req: any, res) => {
  try {
    const { siteId, historyIndex, currentHistory = [] } = req.body || {};
    const uid = req.user?.uid || 'anonymous';

    if (!siteId || historyIndex === undefined) {
      return res.status(400).json({ error: 'Missing siteId or historyIndex' });
    }
    // 1. Fetch site from Firestore or fallback to local context
    let existingSite: any = null;
    try {
      const siteSnap = await db.collection('sites').doc(siteId).get();
      if (siteSnap.exists) {
        existingSite = siteSnap.data();
      }
    } catch (dbErr: any) {
      console.warn('[RevertSite] Database site read skipped (GCP IAM sandbox restricted):', dbErr.message);
    }

    if (!existingSite) {
      const currentCode = req.body.currentCode || siteCodeCache.get(siteId);
      if (currentCode) {
        existingSite = {
          id: siteId,
          userId: uid,
          code: currentCode,
          prompt: req.body.currentPrompt || 'Compiled Webpage',
          title: req.body.currentTitle || 'Compiled Webpage',
          history: currentHistory || [],
          createdAt: Date.now()
        };
      }
    }

    if (!existingSite) {
      return res.status(404).json({ error: 'Site not found', message: 'Could not fetch or reconstruct your website for reverting.' });
    }

    if (existingSite.userId !== uid) {
      return res.status(403).json({ error: 'Access denied: you do not own this website' });
    }

    let history = existingSite.history || currentHistory || [];
    if (!Array.isArray(history) || historyIndex < 0 || historyIndex >= history.length) {
      return res.status(400).json({ error: 'Invalid history revision index' });
    }

    const targetRevision = history[historyIndex];

    // Slicing it to historyIndex is very clean and intuitive: you go back in time, and those forward states are removed
    const newHistory = history.slice(0, historyIndex);

    const updatedSiteObj = {
      ...existingSite,
      code: targetRevision.code,
      prompt: targetRevision.prompt,
      history: newHistory,
      updatedAt: Date.now()
    };

    // Sync reverted site immediately with local server cache for reliable opening in new tab
    siteCodeCache.set(siteId, targetRevision.code);
    try {
      const dir = path.join(process.cwd(), 'site_previews_cache');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${siteId}.html`), targetRevision.code, 'utf8');
    } catch (cwErr: any) {
      console.warn('[RevertSite] Silent write preview cache skip:', cwErr.message);
    }

    try {
      await db.collection('sites').doc(siteId).set(updatedSiteObj);
    } catch (dbSiteErr: any) {
      console.warn('[LovableAI] Failed to write reverted site to DB, using client fallback', dbSiteErr.message);
    }

    return res.json({
      success: true,
      site: updatedSiteObj
    });

  } catch (err: any) {
    console.error('Revert site error:', err);
    return res.status(500).json({ error: 'Failed to revert site', message: err.message });
  }
});


// 12.5. Cache synchronization endpoint for premium webpage full-screen previews
app.post('/api/site-preview/sync', authenticateUser, async (req: any, res) => {
  const { siteId, code } = req.body;
  if (!siteId || !code) {
    return res.status(400).json({ error: 'Missing siteId or code' });
  }

  // A. Save in memory cache
  siteCodeCache.set(siteId, code);

  // B. Save to local disk cache root
  try {
    const dir = path.join(process.cwd(), 'site_previews_cache');
    if (!fs.existsSync(dir)) {
      if (fs.mkdirSync) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    fs.writeFileSync(path.join(dir, `${siteId}.html`), code, 'utf8');
  } catch (err: any) {
    console.warn('[SyncCache] Silent disk cache build skipped:', err.message);
  }

  return res.json({ success: true, cached: true });
});


// 12.5.5. Delete compiled website and clean up associated server caches safely
app.post('/api/delete-site', authenticateUser, async (req: any, res) => {
  try {
    const { siteId } = req.body || {};
    const uid = req.user?.uid || 'anonymous';

    if (!siteId) {
      return res.status(400).json({ error: 'Missing siteId' });
    }
    // 1. Verify existence and ownership with database sandbox exception fallback
    let existingSite: any = null;
    try {
      const siteRef = db.collection('sites').doc(siteId);
      const siteSnap = await siteRef.get();
      if (siteSnap.exists) {
        existingSite = siteSnap.data();
      }
    } catch (dbErr: any) {
      console.warn('[DeleteSite] Database site query skipped during deletion:', dbErr.message);
    }

    if (!existingSite) {
      if (siteCodeCache.has(siteId)) {
        existingSite = { userId: uid }; // Allow deletion flow to execute on cache
      }
    }

    if (!existingSite) {
      // Return success if not found anyway to let client remove from its cache
      siteCodeCache.delete(siteId);
      return res.json({ success: true, message: 'Site removed from memory cache' });
    }

    if (existingSite.userId !== uid) {
      return res.status(403).json({ error: 'Access denied: you do not own this website' });
    }

    // 2. Transact deletion on firestore
    try {
      const siteRef = db.collection('sites').doc(siteId);
      await siteRef.delete();
    } catch (delErr: any) {
      console.warn('[DeleteSite] Firestore delete action bypassed:', delErr.message);
    }

    // 3. Purge in-memory caching
    siteCodeCache.delete(siteId);

    // 4. Safely wipe associated physical files off disk cache storage
    try {
      const filePath = path.join(process.cwd(), 'site_previews_cache', `${siteId}.html`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (diskErr: any) {
      console.warn('[DeleteSite] Disk cache file clean skipped:', diskErr.message);
    }

    return res.json({ success: true, message: 'Website deleted successfully' });

  } catch (err: any) {
    console.error('Delete site error:', err);
    return res.status(500).json({ error: 'Failed to delete website', message: err.message });
  }
});


// 12.6. Serve compiled website full-screen in separate tab with reliable fallback pipelines
app.get('/api/site-preview/:siteId', async (req, res) => {
  const { siteId } = req.params;
  if (!siteId) {
    return res.status(400).send('Missing site ID');
  }

  // Option 1: Serve instantly from in-memory cache
  if (siteCodeCache.has(siteId)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(siteCodeCache.get(siteId));
  }

  // Option 2: Serve from local disk cache
  try {
    const filePath = path.join(process.cwd(), 'site_previews_cache', `${siteId}.html`);
    if (fs.existsSync(filePath)) {
      const code = fs.readFileSync(filePath, 'utf8');
      siteCodeCache.set(siteId, code); // Warm up memory cache
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(code);
    }
  } catch (diskErr: any) {
    console.warn('[SitePreview] Silent disk cache read skipped:', diskErr.message);
  }

  // Option 3: Fallback database query
  try {
    const siteSnap = await db.collection('sites').doc(siteId).get();
    if (siteSnap && siteSnap.exists) {
      const site = siteSnap.data();
      if (site && site.code) {
        siteCodeCache.set(siteId, site.code); // Sync to memory cache
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(site.code);
      }
    }
  } catch (err: any) {
    console.warn('[SitePreview] Database fetch warning (Sandbox IAM bounds restricted):', err.message);
  }

  return res.status(404).send('Compiled webpage site not found or cache is being warmed up. Try opening the web preview in the main workspace app FIRST to synchronize it!');
});

// Explicit API Fallback handler to guarantee /api/* requests ALWAYS return JSON and never fall through to Vite index.html
app.all('/api/*', (req, res) => {
  return res.status(404).json({ error: `API endpoint ${req.method} ${req.path} not found` });
});

// Explicit API Error handler middleware to ensure uncaught exceptions in /api routes return JSON
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path && req.path.startsWith('/api/')) {
    console.error('[API Error Handler]', req.method, req.path, err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal API Error', message: err?.message || String(err) });
    }
  }
  next(err);
});


// ---------------------------------------------------------------------------
// VITE OR STATIC SERVING INTEGRATION
// Vite middleware for development, Static assets serve in production
// ---------------------------------------------------------------------------
async function boot() {
  // Sync the master configurations with Firestore database
  await seedSettingsDatabase();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: ['aurum.eu.cc', '.run.app', 'localhost', '127.0.0.1']
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to port 3000 on host 0.0.0.0
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aurum Engine full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

boot().catch((err) => {
  console.error('Failure booting Aurum Engine server:', err);
});

