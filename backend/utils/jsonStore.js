import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..", "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function writeFallback(filePath, fallbackValue) {
  fs.writeFileSync(filePath, JSON.stringify(fallbackValue, null, 2), "utf8");
}

export function getDataPath(fileName) {
  return path.resolve(DATA_DIR, fileName);
}

export function readJsonFile(fileName, fallbackValue = []) {
  ensureDataDir();

  const filePath = getDataPath(fileName);

  if (!fs.existsSync(filePath)) {
    writeFallback(filePath, fallbackValue);
    return fallbackValue;
  }

  const raw = fs.readFileSync(filePath, "utf-8");

  if (!raw.trim()) {
    writeFallback(filePath, fallbackValue);
    return fallbackValue;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-");
    const backupPath = path.resolve(DATA_DIR, `${fileName}.corrupt.${timestamp}.bak`);

    console.warn(
      `[jsonStore] Corrupted JSON detected in ${filePath}. Renaming to ${backupPath}.`,
      error
    );

    fs.renameSync(filePath, backupPath);
    writeFallback(filePath, fallbackValue);

    return fallbackValue;
  }
}

export function writeJsonFile(fileName, data) {
  ensureDataDir();

  const filePath = getDataPath(fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

  return data;
}

export function appendJsonRecord(fileName, record) {
  const existingData = readJsonFile(fileName, []);
  const records = Array.isArray(existingData) ? existingData : [];

  records.push(record);
  writeJsonFile(fileName, records);

  return record;
}
