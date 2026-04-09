import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const profile = process.argv[2] || process.env.PROFILE || "expected-dau-5000";
const planName = process.argv[3] || process.env.PLAN_NAME || "mixed-api";

const root = process.cwd();
const jmeterRoot = path.join(root, "tests", "load", "jmeter");
const defaultsPath = path.join(jmeterRoot, "common", "defaults.properties");
const profilePath = path.join(jmeterRoot, "profiles", profile, "profile.properties");
const planPath = path.join(jmeterRoot, "plans", `${planName}.jmx`);

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const resultDir = path.join(root, "tests", "load", "results", "jmeter", profile);
const reportDir = path.join(root, "tests", "load", "reports", "jmeter", `${profile}-${timestamp}`);
const resultPath = path.join(resultDir, `${planName}-${timestamp}.jtl`);
const jmeterLogPath = path.join(resultDir, `${planName}-${timestamp}.jmeter.log`);

const jmeterBin = process.env.JMETER_BIN || "jmeter";

if (!fs.existsSync(defaultsPath)) {
  throw new Error(`Missing defaults properties: ${defaultsPath}`);
}
if (!fs.existsSync(profilePath)) {
  throw new Error(`Missing profile properties: ${profilePath}`);
}
if (!fs.existsSync(planPath)) {
  throw new Error(`Missing test plan: ${planPath}`);
}

fs.mkdirSync(resultDir, { recursive: true });
fs.mkdirSync(reportDir, { recursive: true });

const args = [
  "-n",
  "-t",
  planPath,
  "-q",
  defaultsPath,
  "-q",
  profilePath,
  "-l",
  resultPath,
  "-j",
  jmeterLogPath,
  "-e",
  "-o",
  reportDir,
];

console.log(`Running JMeter profile=${profile} plan=${planName}`);
console.log(`Result: ${resultPath}`);
console.log(`Report: ${reportDir}`);
console.log(`JMeter log: ${jmeterLogPath}`);

const child = spawn(jmeterBin, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("error", (error) => {
  if (error.code === "ENOENT") {
    console.error(`Could not find JMeter executable: ${jmeterBin}`);
    console.error("Install JMeter and ensure it is available in PATH, or set JMETER_BIN explicitly.");
    console.error("Examples:");
    console.error("  Linux/WSL: export JMETER_BIN=/opt/apache-jmeter-5.6.3/bin/jmeter");
    console.error("  Windows PowerShell: $env:JMETER_BIN='C:/apache-jmeter-5.6.3/bin/jmeter.bat'");
  } else {
    console.error("Failed to start JMeter", error);
  }
  process.exit(1);
});

child.on("exit", (code) => {
  const numericCode = typeof code === "number" ? code : 1;

  if (numericCode !== 0) {
    console.error(`JMeter failed with code ${numericCode}`);
    process.exit(numericCode);
  }

  let logText = "";
  try {
    if (fs.existsSync(jmeterLogPath)) {
      logText = fs.readFileSync(jmeterLogPath, "utf8");
    }
  } catch {
    // ignore log read errors and continue with file checks below
  }

  const compileError = /Error occurred compiling the tree/i.test(logText);
  const severeError = /\b(?:FATAL|ERROR)\b/i.test(logText);

  if (compileError || severeError) {
    console.error("JMeter reported errors in the run log.");
    console.error(`Inspect log: ${jmeterLogPath}`);
    process.exit(2);
  }

  if (!fs.existsSync(resultPath)) {
    console.error("JMeter exited successfully but no JTL results file was generated.");
    process.exit(2);
  }

  console.log("JMeter run completed successfully");
  process.exit(0);
});
