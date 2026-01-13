import express from "express";
import helmet from "helmet";
import compression from "compression";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

import { generatePdf } from "./generate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Multer for multipart uploads (cover image + footer logo)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB per file
});

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve UI
app.use(express.static(path.join(__dirname, "..", "public")));

// Health + version (proves what's running)
app.get("/health", (req, res) => res.status(200).send("OK"));

app.get("/version", (req, res) => {
  res.json({
    name: "finance-memo-generator-v3",
    version: "3.0.0",
    node: process.version,
    gitSha: process.env.GIT_SHA || "unknown",
    buildTime: process.env.BUILD_TIME || "unknown"
  });
});

// Generate PDF
app.post(
  "/api/generate",
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "footerLogo", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const coverImage = req.files?.coverImage?.[0] || null;
      const footerLogo = req.files?.footerLogo?.[0] || null;

      const pdfBuffer = await generatePdf({
        fields: req.body,
        coverImage,
        footerLogo
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="finance-memorandum.pdf"'
      );
      res.status(200).send(pdfBuffer);
    } catch (err) {
      console.error("Generate error:", err);
      res.status(500).json({
        error: "PDF generation failed",
        message: err?.message || String(err)
      });
    }
  }
);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Finance Memo Generator v3 running on port ${PORT}`);
});
