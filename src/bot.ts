import { Bot, InlineKeyboard, Context } from "grammy";
import { saveMonitoredChats } from "./persistence";
import { getChatName } from "./client";
import { fetchReport } from "./utils";

export interface MonitoredChat {
  id: string;
  name: string;
}

export interface MonitoredChats {
  [userId: string]: MonitoredChat[];
}

export interface ExtendedBot extends Bot {
  telegramClient?: any; // Replace 'any' with the actual type if known
}

export function createBot(apiBot: string, monitoredChats: MonitoredChats) {
  const bot: ExtendedBot = new Bot(apiBot);

  // Start Command (Help Section)
  bot.command("start", async (ctx: Context) => {
    const keyboard = new InlineKeyboard().text("📋 List Chats", "list_chats");

    await ctx.reply(
      "Welcome to the Chat Monitor Bot!\n\n" +
        "Here are the available commands:\n" +
        "1. /add_chat <chat_id> - Add a chat ID to monitor.\n" +
        "2. /list_chats - List all the chats you are currently monitoring.\n" +
        "3. /remove_chat <chat_id> - Remove a chat ID from monitoring.\n\n" +
        "Use the buttons below for quick actions!",
      { reply_markup: keyboard }
    );
  });

  // Add Chat Command
  bot.command("add_chat", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (!monitoredChats[userId]) monitoredChats[userId] = [];

    const chatId = ctx.message?.text?.split(" ")[1]; // Extract chat ID
    if (!chatId) {
      await ctx.reply(
        "Please specify a chat ID. Example: /add_chat 1234567890"
      );
      return;
    }

    const existingChat = monitoredChats[userId].find(
      (chat) => chat.id === chatId
    );
    if (existingChat) {
      await ctx.reply(
        `Chat ID ${chatId} (${existingChat.name}) is already monitored.`
      );
      return;
    }

    if (!bot.telegramClient) {
      await ctx.reply("Telegram client not ready yet. Please try again later.");
      return;
    }

    try {
      const chatName = await getChatName(bot.telegramClient, chatId);
      monitoredChats[userId].push({ id: chatId, name: chatName });
      saveMonitoredChats(monitoredChats);
      await ctx.reply(`Chat ID ${chatId} (${chatName}) added.`);
    } catch (err) {
      await ctx.reply("Failed to add the chat. Please check the chat ID.");
    }
  });

  // List Chats Command
  bot.command("list_chats", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (!monitoredChats[userId] || monitoredChats[userId].length === 0) {
      await ctx.reply("No monitored chats. Add one with /add_chat <chat_id>.");
      return;
    }

    const chatDetails = monitoredChats[userId]
      .map((chat) => `${chat.name} (ID: ${chat.id})`)
      .join("\n");
    await ctx.reply(`Monitored chats:\n${chatDetails}`);
  });

  // Remove Chat Command
  bot.command("remove_chat", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (!monitoredChats[userId] || monitoredChats[userId].length === 0) {
      await ctx.reply("You are not monitoring any chats to remove.");
      return;
    }

    const chatId = ctx.message?.text?.split(" ")[1]; // Extract chat ID from command
    if (!chatId) {
      await ctx.reply(
        "Please specify a chat ID. Example: /remove_chat 1234567890"
      );
      return;
    }

    // Find the index of the chat with the given ID
    const index = monitoredChats[userId].findIndex(
      (chat) => chat.id === chatId
    );
    if (index > -1) {
      const removedChat = monitoredChats[userId].splice(index, 1)[0]; // Remove the chat
      saveMonitoredChats(monitoredChats); // Save to file after updating
      await ctx.reply(
        `Chat "${removedChat.name}" (ID: ${chatId}) removed from monitoring.`
      );
    } else {
      await ctx.reply(`Chat ID ${chatId} is not in your monitored list.`);
    }
  });

  // Handle Callback Query for Listing Chats
  bot.callbackQuery("list_chats", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (!monitoredChats[userId] || monitoredChats[userId].length === 0) {
      await ctx.reply("No monitored chats. Add one with /add_chat <chat_id>.");
      return;
    }

    const chatDetails = monitoredChats[userId]
      .map((chat) => `${chat.name} (ID: ${chat.id})`)
      .join("\n");
    await ctx.reply(`Monitored chats:\n${chatDetails}`);
    await ctx.answerCallbackQuery(); // Acknowledge the button press
  });

  bot.callbackQuery(/^get_report_(.+)$/, async (ctx: Context) => {
    if (ctx.match === undefined) return;
    const solanaAddress = ctx.match[1]; // Extract the Solana address from the button's data

    const report = await fetchReport(solanaAddress); // Replace this with your actual function to fetch the report
    console.log("🚀 « report:", report);
    if (!report) {
      await ctx.reply("Unable to generate the report for this token.");
      return;
    }

    const reportMessage = `
  <b>📋 Detailed Report</b>
  <b>Symbol:</b> ${report.symbol || "Unknown"}
  <b>Description:</b> ${report.uri.description || "Unknown"}
  <b>Score:</b> ${report.score || "Unknown"}
  <b>Total Supply:</b> ${report.supply || "N/A"}
  <b>Mutable:</b> ${report.mutable || "N/A"}
  <b>Top Holders:</b> ${report.topHolders || "N/A"}
  <b>Risks:</b> ${report.risks || "Unknown"}
  <b>Rugged:</b> ${String(report.rugged) || "Unknown"}
    `;

    await ctx.reply(reportMessage, { parse_mode: "HTML" });
    await ctx.answerCallbackQuery(); // Acknowledge the button press
  });

  return bot;
}
