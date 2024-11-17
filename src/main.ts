import { loadMonitoredChats } from "./persistence";
import { createBot, ExtendedBot } from "./bot";
import { setupClient } from "./client";
import { StoreSession } from "telegram/sessions";
import { TelegramClient } from "telegram";
import { input } from "@inquirer/prompts";
import { config } from "./config";

// Load persisted data
const monitoredChats = loadMonitoredChats();

// Initialize the bot
const bot: ExtendedBot = createBot(config.apiBot, monitoredChats);
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
setupClient(
  Number(config.apiId),
  config.apiHash,
  storeSession,
  input,
  bot,
  monitoredChats
)
  .then((telegramClient: TelegramClient) => {
    console.log("Telegram client setup completed.");
    bot.telegramClient = telegramClient; // Pass the client to the bot dynamically
  })
  .catch((err: Error) => {
    console.error("Failed to set up Telegram client:", err);
  });
