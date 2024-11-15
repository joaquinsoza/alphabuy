const fs = require("fs");
const path = require("path");

const persistenceFilePath = path.resolve(__dirname, "../monitoredChats.json");

function loadMonitoredChats() {
  if (fs.existsSync(persistenceFilePath)) {
    try {
      const data = fs.readFileSync(persistenceFilePath, "utf-8");
      return JSON.parse(data);
    } catch (err) {
      console.error("Failed to load monitored chats:", err);
    }
  }
  return {};
}

function saveMonitoredChats(monitoredChats) {
  try {
    fs.writeFileSync(
      persistenceFilePath,
      JSON.stringify(monitoredChats, null, 2)
    );
  } catch (err) {
    console.error("Failed to save monitored chats:", err);
  }
}

module.exports = {
  loadMonitoredChats,
  saveMonitoredChats,
};
