import fs from "fs";
import path from "path";

const BASE_URL = process.env.LOAD_BASE_URL || "http://127.0.0.1:6060";
const usersCsvPath = process.env.LOAD_USERS_CSV || "tests/load/jmeter/data/users.csv";
const adminsCsvPath = process.env.LOAD_ADMINS_CSV || "tests/load/jmeter/data/admins.csv";
const outputPath = process.env.LOAD_TOKENS_OUTPUT || "tests/load/jmeter/data/tokens.generated.csv";

const readCsv = (csvPath) => {
  const raw = fs.readFileSync(csvPath, "utf8").trim();
  const [header, ...rows] = raw.split(/\r?\n/);
  const keys = header.split(",");
  return rows.filter(Boolean).map((row) => {
    const values = row.split(",");
    const obj = {};
    keys.forEach((key, idx) => {
      obj[key.trim()] = (values[idx] || "").trim();
    });
    return obj;
  });
};

const login = async (email, password) => {
  const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (!response.ok || !body.token) {
    return null;
  }
  return body.token;
};

const main = async () => {
  const users = readCsv(usersCsvPath);
  const admins = readCsv(adminsCsvPath);

  const lines = ["role,email,token"];

  for (const user of users) {
    const token = await login(user.email, user.password);
    if (token) {
      lines.push(`user,${user.email},${token}`);
    }
  }

  for (const admin of admins) {
    const token = await login(admin.email, admin.password);
    if (token) {
      lines.push(`admin,${admin.email},${token}`);
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Generated ${lines.length - 1} token rows at ${outputPath}`);
};

main().catch((error) => {
  console.error("Failed to generate tokens", error);
  process.exit(1);
});
