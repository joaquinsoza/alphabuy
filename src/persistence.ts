import * as fs from "fs";
import * as path from "path";
import { MonitoredChats } from "./bot";

const persistenceFilePath = path.resolve(__dirname, "../monitoredChats.json");

export function loadMonitoredChats(): MonitoredChats {
  if (fs.existsSync(persistenceFilePath)) {
    try {
      const data = fs.readFileSync(persistenceFilePath, "utf-8");
      return JSON.parse(data) as MonitoredChats;
    } catch (err) {
      console.error("Failed to load monitored chats:", err);
    }
  }
  return {};
}

export function saveMonitoredChats(monitoredChats: MonitoredChats): void {
  try {
    fs.writeFileSync(
      persistenceFilePath,
      JSON.stringify(monitoredChats, null, 2)
    );
  } catch (err) {
    console.error("Failed to save monitored chats:", err);
  }
}
