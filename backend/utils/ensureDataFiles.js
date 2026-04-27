import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

const REQUIRED_FILES = {
  "eventLogs.json": [],
  "cases.json": [],
  "receiptRecords.json": [],
};

export function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  for (const [fileName, initialValue] of Object.entries(REQUIRED_FILES)) {
    const filePath = path.join(DATA_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(initialValue, null, 2), "utf-8");
      console.log(`[data] created ${fileName}`);
    }
  }
}