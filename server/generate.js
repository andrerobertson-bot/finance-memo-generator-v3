import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { validateFields } from "./schema.js";
import { renderTemplate } from "./template.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function toDataUrl(file) {
  if (!file) return "";
  const mime = file.mimetype || "application/octet-stream";
  const b64 = file.buffer.toString("base64");
  return `data:${mime};base64,${b64}`;
}

export async function generatePdf({ fields, coverImage, footerLogo }) {
  const data = validateFields(fields);

  const coverImageUrl = toDataUrl(coverImage);
  const footerLogoUrl = toDataUrl(footerLogo);

  const templatesDir = path.join(__dirname, "..", "templates");
  const docTpl = fs.readFileSync(path.join(templatesDir, "document.html"), "utf8");
  const coverSvgTpl = fs.readFileSync(path.join(templatesDir, "page1-cover.svg"), "utf8");
  const page2Tpl = fs.readFileSync(path.join(templatesDir, "pages", "page2.html"), "utf8");

  const coverSvg = renderTemplate(coverSvgTpl, {
    ...data,
    COVER_IMAGE_URL: coverImageUrl
  });

  const page2Html = renderTemplate(page2Tpl, {
    ...data,
    FOOTER_LOGO_URL: footerLogoUrl
  });

  const html = renderTemplate(docTpl, {
    COVER_SVG: coverSvg,
    PAGE2_HTML: page2Html,
    FOOTER_LOGO_URL: footerLogoUrl,
    FOOTER_LINE: data.footerLine
  });

  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.waitForTimeout(150);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" }
    });

    return pdf;
  } finally {
    await browser.close();
  }
}
