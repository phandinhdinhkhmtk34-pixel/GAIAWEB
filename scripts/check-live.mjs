// Kiểm tra nhanh web thật: mã trạng thái, lỗi JavaScript, tràn ngang trên điện thoại, chữ phải có / không được có.
// Cách dùng: node scripts/check-live.mjs [--has "chữ"]... [--not "chữ"]... [--url https://...]
// Playwright is pre-installed globally in Claude cloud sessions (require works, ESM import does not).
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const args = process.argv.slice(2);
const pick = (flag) => args.flatMap((a, i) => (a === flag ? [args[i + 1]] : []));
const BASE = pick("--url")[0] ?? "https://gaiaweb-beryl.vercel.app";
const HAS = pick("--has");
const NOT = pick("--not");
const PAGES = ["/ja", "/vi", "/en", "/ja/library", "/ja/faq", "/ja/contact", "/ja/login", "/ja/signup", "/ja/legal/terms", "/ja/legal/contract"];

const browser = await chromium.launch();
let problems = 0;
const homeText = [];
for (const [label, viewport] of [["desktop", { width: 1280, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport });
  for (const path of PAGES) {
    const errors = [];
    page.removeAllListeners("pageerror");
    page.on("pageerror", (e) => errors.push(e.message.slice(0, 120)));
    const res = await page.goto(BASE + path, { waitUntil: "load", timeout: 45000 }).catch((e) => ({ status: () => String(e).slice(0, 60) }));
    await page.waitForTimeout(1200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1).catch(() => false);
    if (path === "/ja") homeText.push(await page.evaluate(() => document.body.innerText));
    const bad = res.status() !== 200 || errors.length || overflow;
    if (bad) problems++;
    console.log(`${bad ? "✗" : "✓"} ${label.padEnd(7)} ${path.padEnd(20)} status=${res.status()} errors=${errors.length} overflow=${overflow}${errors.length ? " " + errors[0] : ""}`);
  }
  await page.close();
}
const text = homeText.join("\n");
for (const s of HAS) { const ok = text.includes(s); if (!ok) problems++; console.log(`${ok ? "✓" : "✗"} trang chủ có "${s}"`); }
for (const s of NOT) { const ok = !text.includes(s); if (!ok) problems++; console.log(`${ok ? "✓" : "✗"} trang chủ không còn "${s}"`); }
await browser.close();
console.log(problems ? `\n${problems} vấn đề cần xem.` : "\nKhông có vấn đề.");
process.exit(problems ? 1 : 0);
