const input = require("input");
const { apiId, apiHash, apiBot } = require("./config");
const { loadMonitoredChats } = require("./persistence");
const { createBot } = require("./bot");
const { setupClient } = require("./client");
const { StoreSession } = require("telegram/sessions");

// Load persisted data
const monitoredChats = loadMonitoredChats();

// Initialize the bot
const bot = createBot(apiBot, monitoredChats);
bot.start(); // Start the bot immediately
console.log(`
  █████╗ ██╗     ██████╗ ██╗  ██╗ █████╗ 
 ██╔══██╗██║     ██╔══██╗██║  ██║██╔══██╗
 ███████║██║     ██████╔╝███████║███████║
 ██╔══██║██║     ██╔═══╝ ██╔══██║██╔══██║
 ██║  ██║███████╗██║     ██║  ██║██║  ██║
 ╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝

 ██████╗ ██╗   ██╗██╗   ██╗
 ██╔══██╗██║   ██║╚██╗ ██╔╝
 ██████╔╝██║   ██║ ╚████╔╝ 
 ██╔══██╗██║   ██║  ╚██╔╝  
 ██████╔╝╚██████╔╝   ██║   
 ╚═════╝  ╚═════╝    ╚═╝   
`);

// Set up the Telegram client
const storeSession = new StoreSession("telegram_session");
setupClient(apiId, apiHash, storeSession, input, bot, monitoredChats)
  .then((telegramClient) => {
    console.log("Telegram client setup completed.");
    bot.telegramClient = telegramClient; // Pass the client to the bot dynamically
  })
  .catch((err) => {
    console.error("Failed to set up Telegram client:", err);
  });
