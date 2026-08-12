import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import multer from "multer"; //only used to detect MulterError (file too large, etc.)
import speechRoutes from "./services/speech.js";
import { arcjetProtection } from "./middleware/arcjetMiddleware.js";  
import authRoutes from "./routes/authRoutes.js"
import translations from "./routes/translations.js"
import paymentRoutes, { razorpayWebhook } from "./routes/payments.js"
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
app.use(express.static('public'));
app.use('/api/auth' , authRoutes);
app.use('/api' , arcjetProtection, speechRoutes);
app.use('/api/translations' , arcjetProtection, translations)
app.use("/api/payments", arcjetProtection, paymentRoutes);
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

app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
});

