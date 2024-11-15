const input = require("input");
const { apiId, apiHash, apiBot } = require("./config");
const { loadMonitoredChats } = require("./persistence");
const createBot = require("./bot");
const setupClient = require("./client");
const { StoreSession } = require("telegram/sessions");

// Load persisted data
const monitoredChats = loadMonitoredChats();

// Create the bot
const bot = createBot(apiBot, monitoredChats);
bot.start();

// Setup the Telegram client
(async () => {
  console.log("Starting Telegram client setup...");
  const storeSession = new StoreSession("telegram_session");

  try {
    await setupClient(apiId, apiHash, storeSession, input, bot, monitoredChats);
    console.log("Bot is ready to add and monitor chats!");
  } catch (err) {
    console.error("Failed to connect to Telegram:", err);
  }
})();
