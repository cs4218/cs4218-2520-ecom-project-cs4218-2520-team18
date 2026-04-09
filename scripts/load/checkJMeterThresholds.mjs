import fs from "fs";

const resultPath = process.argv[2] || process.env.LOAD_JTL_PATH;
if (!resultPath) {
  console.error("Usage: node scripts/load/checkJMeterThresholds.mjs <jtl-path>");
  process.exit(1);
}

if (!fs.existsSync(resultPath)) {
  console.error(`JTL file not found: ${resultPath}`);
  process.exit(1);
}

const p95Ms = Number(process.env.LOAD_SLO_P95_MS || 700);
const maxErrorRate = Number(process.env.LOAD_SLO_ERROR_RATE || 0.01);

const content = fs.readFileSync(resultPath, "utf8").trim();
const lines = content.split(/\r?\n/).filter(Boolean);
if (lines.length < 2) {
  console.error("JTL file has no data rows");
  process.exit(1);
}

const headers = lines[0].split(",");
const idx = Object.fromEntries(headers.map((name, i) => [name.trim(), i]));
const elapsedIdx = idx.elapsed;
const successIdx = idx.success;

if (elapsedIdx === undefined || successIdx === undefined) {
  console.error("JTL CSV must include elapsed and success columns");
  process.exit(1);
}

const elapsed = [];
let failures = 0;

for (let i = 1; i < lines.length; i += 1) {
  const cols = lines[i].split(",");
  const ms = Number(cols[elapsedIdx]);
  if (Number.isFinite(ms)) {
    elapsed.push(ms);
  }
  const success = (cols[successIdx] || "").trim().toLowerCase();
  if (success !== "true") {
    failures += 1;
  }
}

if (!elapsed.length) {
  console.error("No elapsed values found in JTL");
  process.exit(1);
}

elapsed.sort((a, b) => a - b);
const p95Index = Math.min(elapsed.length - 1, Math.floor(0.95 * elapsed.length));
const observedP95 = elapsed[p95Index];
const errorRate = failures / (lines.length - 1);

console.log(`Threshold check for ${resultPath}`);
console.log(`Samples: ${lines.length - 1}`);
console.log(`Observed p95: ${observedP95} ms (target <= ${p95Ms} ms)`);
console.log(`Observed error rate: ${(errorRate * 100).toFixed(2)}% (target <= ${(maxErrorRate * 100).toFixed(2)}%)`);

if (observedP95 > p95Ms || errorRate > maxErrorRate) {
  console.error("Load thresholds failed");
  process.exit(2);
}

console.log("Load thresholds passed");
