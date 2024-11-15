const PropertiesReader = require("properties-reader");
const configs = PropertiesReader("config.properties");
getProp = (bundle, key) => {
  return configs.get(`${bundle}.${key}`);
};

const { TelegramClient } = require("telegram");
const { StoreSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const input = require("input");

const { Bot } = require("grammy");

// Configuration
const apiId = getProp("telegram", "apiId");
const apiHash = getProp("telegram", "apiHash");
const apiBot = getProp("telegram-bot", "api");
const storeSession = new StoreSession("telegram_session"); // Persistent session storage

// State to store chat IDs for each user
const monitoredChats = {};

// Telegram Bot Setup
const bot = new Bot(apiBot);

// Add Chat Command
bot.command("add_chat", async (ctx) => {
  const userId = ctx.from.id;

  if (!monitoredChats[userId]) {
    monitoredChats[userId] = [];
  }

  const chatId = ctx.message.text.split(" ")[1]; // Extract chat ID from command
  if (!chatId) {
    await ctx.reply("Please specify a chat ID. Example: /add_chat 1234567890");
    return;
  }

  monitoredChats[userId].push(chatId);
  await ctx.reply(`Chat ID ${chatId} added. Listening for messages...`);
});

// Relay Messages Command
bot.command("list_chats", async (ctx) => {
  const userId = ctx.from.id;

  if (!monitoredChats[userId] || monitoredChats[userId].length === 0) {
    await ctx.reply(
      "You are not listening to any chats. Add one with /add_chat <chat_id>"
    );
    return;
  }

  await ctx.reply(
    `You are currently monitoring the following chats:\n${monitoredChats[
      userId
    ].join("\n")}`
  );
});

// Start the bot
bot.start();

// Telegram Client Setup
(async () => {
  console.log("Starting Telegram client setup...");

  const client = new TelegramClient(storeSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  try {
    // User Interaction for Setup
    await client.start({
      phoneNumber: async () => await input.text("Please enter your number: "),
      password: async () => await input.text("Please enter your password: "),
      phoneCode: async () =>
        await input.text("Please enter the code you received: "),
      onError: (err) => console.log("Error during login:", err),
    });

    console.log("Successfully connected to Telegram!");
    client.session.save(); // Save the session for reuse

    // Listen for Messages in Added Chats
    async function handleMessage(event) {
      const message = event.message;
      const chatId = String(message.chatId);
      const text = message.text || "Non-text message received";

      // Relay messages only from monitored chats
      for (const [userId, chatIds] of Object.entries(monitoredChats)) {
        if (chatIds.includes(chatId)) {
          await bot.api.sendMessage(
            userId,
            `Message from chat ${chatId}: ${text}`
          );
        }
      }
    }

    // Add Event Handler for All Monitored Chats
    client.addEventHandler(handleMessage, new NewMessage());

    console.log("Bot is ready to add and monitor chats!");
  } catch (err) {
    console.error("Failed to connect to Telegram:", err);
  }
})();
