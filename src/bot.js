const { Bot, InlineKeyboard } = require("grammy");
const { saveMonitoredChats } = require("./persistence");

function createBot(apiBot, monitoredChats) {
  const bot = new Bot(apiBot);

  // Start Command (Help Section)
  bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard().text("📋 List Chats", "list_chats");

    await ctx.reply(
      "Welcome to the Chat Monitor Bot!\n\n" +
        "Here are the available commands:\n" +
        "1. /add_chat <chat_id> - Add a chat ID to monitor.\n" +
        "2. /list_chats - List all the chats you are currently monitoring.\n\n" +
        "Use the buttons below for quick actions!",
      { reply_markup: keyboard }
    );
  });

  // Add Chat Command
  bot.command("add_chat", async (ctx) => {
    const userId = ctx.from.id;

    if (!monitoredChats[userId]) {
      monitoredChats[userId] = [];
    }

    const chatId = ctx.message.text.split(" ")[1]; // Extract chat ID from command
    if (!chatId) {
      await ctx.reply(
        "Please specify a chat ID. Example: /add_chat 1234567890"
      );
      return;
    }

    if (!monitoredChats[userId].includes(chatId)) {
      monitoredChats[userId].push(chatId);
      saveMonitoredChats(monitoredChats); // Save to file after updating
      await ctx.reply(`Chat ID ${chatId} added. Listening for messages...`);
    } else {
      await ctx.reply(`Chat ID ${chatId} is already being monitored.`);
    }
  });

  // List Chats Command
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

  bot.callbackQuery("list_chats", async (ctx) => {
    const userId = ctx.from.id;

    if (!monitoredChats[userId] || monitoredChats[userId].length === 0) {
      await ctx.reply(
        "You are not listening to any chats. Add one with /add_chat <chat_id>"
      );
    } else {
      await ctx.reply(
        `You are currently monitoring the following chats:\n${monitoredChats[
          userId
        ].join("\n")}`
      );
    }
    await ctx.answerCallbackQuery(); // Acknowledge the button press
  });

  return bot;
}

module.exports = createBot;
