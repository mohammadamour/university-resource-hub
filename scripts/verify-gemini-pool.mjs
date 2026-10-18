import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Force IPv4
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");

if (!fs.existsSync(envPath)) {
  console.error("❌ .env.local not found at:", envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf-8");
const keysMatch = envContent.match(/GEMINI_API_KEYS\s*=\s*(.+)/);
const singleKeyMatch = envContent.match(/GEMINI_API_KEY\s*=\s*(.+)/);

let rawKeys = "";
if (keysMatch) {
  rawKeys = keysMatch[1].trim().replace(/^["']|["']$/g, "");
} else if (singleKeyMatch) {
  rawKeys = singleKeyMatch[1].trim().replace(/^["']|["']$/g, "");
}

const keys = rawKeys
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

console.log(`\n🔑 Found ${keys.length} Gemini API Key(s) in .env.local`);
console.log("---------------------------------------------------------");

if (keys.length === 0) {
  console.log("⚠️ No keys detected. Set GEMINI_API_KEYS in .env.local like:");
  console.log('GEMINI_API_KEYS="key1,key2,key3"\n');
  process.exit(0);
}

const TEST_MODEL = "gemini-3.5-flash";

async function verifyAll() {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const masked = key.slice(0, 8) + "..." + key.slice(-4);
    const start = Date.now();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${TEST_MODEL}:generateContent?key=${key}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Respond with OK" }] }],
          generationConfig: {
            maxOutputTokens: 5,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });

      const elapsed = Date.now() - start;

      if (res.ok) {
        console.log(`[Key ${i + 1}/${keys.length}] ${masked} ➔ ✅ ACTIVE (${elapsed}ms) [${TEST_MODEL}]`);
      } else {
        const errorText = await res.text();
        let reason = `HTTP ${res.status}`;
        try {
          const parsed = JSON.parse(errorText);
          reason = parsed.error?.message || reason;
        } catch {}
        console.log(`[Key ${i + 1}/${keys.length}] ${masked} ➔ ❌ FAILED (${elapsed}ms): ${reason}`);
      }
    } catch (err) {
      console.log(`[Key ${i + 1}/${keys.length}] ${masked} ➔ 💥 NETWORK ERROR: ${err.message}`);
    }
  }
  console.log("---------------------------------------------------------\n");
}

verifyAll();
