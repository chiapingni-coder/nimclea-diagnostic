import fs from "fs";
import path from "path";

export function ensureJsonFile(filePath, defaultValue = []) {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf-8");
  }
}

export function readJsonFile(filePath, defaultValue = []) {
  ensureJsonFile(filePath, defaultValue);

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (error) {
    console.error(`readJsonFile error: ${filePath}`, error);
    return defaultValue;
  }
}

export function writeJsonFile(filePath, data) {
  ensureJsonFile(filePath, []);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function appendJsonFile(filePath, item, defaultValue = []) {
  const current = readJsonFile(filePath, defaultValue);
  current.push(item);
  writeJsonFile(filePath, current);
  return item;
}

export function makeId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}