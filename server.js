import dotenv from "dotenv";
dotenv.config();
import http from "http";
import { WebSocketServer } from "ws";
import express from "express";
import cors from "cors";
import multer from "multer"; //only used to detect MulterError (file too large, etc.)
import speechRoutes from "./services/speech.js";
import { handleStreamConnection } from "./services/speechStream.js";
import { arcjetProtection } from "./middleware/arcjetMiddleware.js";
import authRoutes from "./routes/authRoutes.js"
import translations from "./routes/translations.js"
import paymentRoutes, { razorpayWebhook } from "./routes/payments.js"
import usageRoutes from "./routes/usage.js"
const app=express();
//regardless of express.json() below, the webhook must receive the RAW body buffer
//for HMAC signature verification — register it BEFORE express.json()
app.post("/api/webhooks/razorpay", express.raw({ type: "application/json" }), razorpayWebhook);

app.set('trust proxy', true);
//therefore express.json after it
app.use(express.json());

//CORS — allows browser clients (mobile native is unaffected); default = allow all origins
app.use(cors());

//request timeout — a hung upstream call (Sarvam) cannot hang the request forever
app.use((req, res, next) => {
    req.setTimeout(60_000, () => {});
    res.setTimeout(60_000);
    next();
});

//health check for uptime monitors / load balancers
app.get('/healthz', (req, res) => res.json({ status: "ok" }));

app.get('/', (req, res) => res.redirect('/test.html'));
// Public policy URLs for the Play listing. Set SUPPORT_EMAIL to a monitored address
// before deployment; the deletion route remains usable after a user uninstalls the app.
const supportEmail = process.env.SUPPORT_EMAIL || "support@example.com";
app.get("/account-deletion", (req, res) => res.type("html").send(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Delete your Mutter account</title></head><body><main><h1>Delete your Mutter account</h1><p>To request deletion of your Mutter account and associated transcripts, recordings, and subscription data, email <a href="mailto:${supportEmail}?subject=Mutter%20account%20deletion%20request">${supportEmail}</a> from the email address on your account. We may ask you to verify ownership before completing the request.</p><p>You can also delete your account immediately in the Mutter app: Profile → Account → Delete account.</p></main></body></html>`));
app.get("/privacy", (req, res) => res.type("html").send(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mutter Privacy Policy</title></head><body><main><h1>Mutter Privacy Policy</h1><p>Mutter processes account email, microphone audio submitted for dictation, generated transcripts and translations, usage counts, and subscription status to provide dictation and account features. Audio and transcripts are stored only for the features you enable and are not used to train AI models.</p><p>Mutter shares data with its service providers solely to operate the service, including authentication, storage, speech processing, and payment providers. We do not sell personal data.</p><p>You can delete individual transcripts in the app and delete your account and associated data in Profile → Account → Delete account, or via <a href="/account-deletion">our deletion-request page</a>.</p><p>For privacy questions, contact <a href="mailto:${supportEmail}">${supportEmail}</a>.</p></main></body></html>`));
app.use(express.static('public'));
app.use('/api/auth' , authRoutes);
app.use('/api' , arcjetProtection, speechRoutes);
app.use('/api/translations' , arcjetProtection, translations)
app.use("/api/payments", arcjetProtection, paymentRoutes);
app.use("/api/usage", arcjetProtection, usageRoutes);
const PORT= process.env.PORT||3000;

//global error handler — catches async rejections + multer/syntax errors, returns clean JSON, never crashes the process
app.use((err, req, res, next) => {
    // multer errors: file too large, wrong field name, etc.
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            error: err.code === "LIMIT_FILE_SIZE" ? "File too large — max 10MB" : err.message
        });
    }
    // malformed JSON body
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ error: "Invalid JSON body" });
    }
    // never leak stack traces to clients
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

// Live streaming dictation — the bubble's real-time mic pipeline. Shares the
// same HTTP port as Express; only /api/speech-stream upgrades are accepted.
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
    const { pathname } = new URL(req.url, "http://internal");
    if (pathname === "/api/speech-stream") {
        wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
    } else {
        socket.destroy();
    }
});

wss.on("connection", handleStreamConnection);

server.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
});

