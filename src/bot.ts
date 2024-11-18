import { Bot, InlineKeyboard, Context } from "grammy";
import { saveMonitoredChats } from "./persistence";
import { getChatName } from "./client";
import { fetchReport, fetchToken, TokenPair } from "./utils";
import { apiSwap } from "./raydium";
import { Api, TelegramClient } from "telegram";
import {
  AccountLayout,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { connection, owner } from "./config";
import { PublicKey } from "@solana/web3.js";

export interface MonitoredChat {
  id: string;
  name: string;
}

export interface MonitoredChats {
  [userId: string]: MonitoredChat[];
}

export interface ExtendedBot extends Bot {
  telegramClient?: TelegramClient;
  clientMeId?: Api.long;
}

export function createBot(apiBot: string, monitoredChats: MonitoredChats) {
  const bot: ExtendedBot = new Bot(apiBot);

  // Middleware to restrict access to the client only
  bot.use(async (ctx, next) => {
    if (!bot.clientMeId) {
      await ctx.reply(
        "⚠️ Bot configuration is incomplete. Please set up the bot properly and try again."
      );
      return;
    }

    if (ctx.from?.id !== parseInt(bot.clientMeId.toString())) {
      await ctx.reply(
        "❌ Unauthorized access. You are not allowed to use this bot."
      );
      return;
    }

    await next();
  });

  // Start Command (Help Section)
  bot.command("start", async (ctx: Context) => {
    const keyboard = new InlineKeyboard()
      .text("📋 List Chats", "list_chats")
      .row()
      .text("💰 Wallet", "wallet");

    await ctx.reply(
      "Welcome to the Chat Monitor Bot!\n\n" +
        "Here are the available commands:\n" +
        "1. /wallet - Show wallet and options\n" +
        "2. /add_chat <chat_id> - Add a chat ID to monitor.\n" +
        "3. /list_chats - List all the chats you are currently monitoring.\n" +
        "4. /remove_chat <chat_id> - Remove a chat ID from monitoring.\n\n" +
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

  bot.command("wallet", async (ctx: Context) => {
    try {
      const solBalance = await connection.getBalance(owner.publicKey);
      const solBalanceInSOL = (solBalance / 10 ** 9).toFixed(4);

      const keyboard = new InlineKeyboard()
        .text("View Positions", "get_positions")
        .url(
          "View Wallet in Solscan",
          `https://solscan.io/account/${owner.publicKey.toBase58()}`
        );

      const message = `
  <b>💰 Wallet Summary</b>
  <b>SOL Balance:</b> ${solBalanceInSOL} SOL
  
  Use the buttons below for more actions.
      `;

      await ctx.reply(message, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } catch (error) {
      console.error("Error in /menu command:", error);
      await ctx.reply(
        "❌ Failed to fetch wallet information. Please try again."
      );
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
    await safeAnswerCallbackQuery(ctx);
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
    await safeAnswerCallbackQuery(ctx);
  });

  bot.callbackQuery(/^buy_(.+)_(.+)$/, async (ctx: Context) => {
    if (ctx.match === undefined) return;
    const amount = ctx.match[1];
    const solanaAddress = ctx.match[2];

    if (!amount || !solanaAddress) {
      await ctx.reply("Invalid buy request.");
      await ctx.answerCallbackQuery(); // Acknowledge the button press
      return;
    }

    try {
      const swapAmount = parseFloat(amount) * 10 ** 9; // Convert SOL to lamports (1 SOL = 1e9 lamports)

      // Execute the swap
      const result = await apiSwap({
        inputMint: NATIVE_MINT.toBase58(), // Native SOL mint
        outputMint: solanaAddress,
        amount: swapAmount,
        slippage: 2, // 0.5% slippage
      });

      if (result?.status !== "success") {
        let message = `
<b>❌ ${result.reason}.</b>
      `;

        await ctx.reply(message, { parse_mode: "HTML" });
        return;
      }

      let message = `
<b>✅ Successfully bought ${amount} SOL!</b>
<a href="https://solscan.io/tx/${result?.txId}">View on Solscan</a>
`;

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (error) {
      console.error("Swap error:", error);
      await ctx.reply("❌ Failed to complete the swap. Please try again.");
    }

    await safeAnswerCallbackQuery(ctx);
  });

  bot.callbackQuery("get_positions", async (ctx: Context) => {
    try {
      // Fetch SOL balance
      const solBalance = await connection.getBalance(owner.publicKey);
      const solBalanceInSOL = (solBalance / 10 ** 9).toFixed(4);

      // Fetch all token accounts
      const tokenAccounts = await connection.getTokenAccountsByOwner(
        owner.publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      const positions = [];
      for (const { pubkey, account } of tokenAccounts.value) {
        try {
          // Decode the raw account data
          const accountInfo = AccountLayout.decode(account.data);

          const mintAddress = new PublicKey(accountInfo.mint).toBase58();
          //TODO: All tokens have 6 decimals?
          const amount = Number(accountInfo.amount) / 10 ** 6;
          const rawAmount = Number(accountInfo.amount);

          const token: TokenPair | null = await fetchToken(mintAddress);

          if (mintAddress !== NATIVE_MINT.toBase58() && amount > 0) {
            positions.push({ token, mintAddress, amount, rawAmount });
          }
        } catch (error) {
          console.error("Failed to decode account data:", error);
        }
      }

      // Construct the message
      let message = `
<b>💰 Your Wallet Positions:</b>
<b>SOL Balance:</b> ${solBalanceInSOL} SOL

<b>Tokens:</b>
      `;

      const keyboard = new InlineKeyboard();

      positions.forEach((position, index) => {
        message += `
<b>${position.token.symbol}</b>
Balance: ${position.amount.toFixed(4)}
      `;

        keyboard.text(
          `Sell All ${position.token.symbol}`,
          `sell_${position.rawAmount}_${position.mintAddress}`
        );
        keyboard.text(
          `Sell Half`,
          `sell_${position.rawAmount / 2}_${position.mintAddress}`
        );
        keyboard.url("DexScreener", position.token.dexscreener);
        keyboard.row();
      });

      // Send the message
      await ctx.reply(message, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } catch (error) {
      console.error("Error fetching positions:", error);
      await ctx.reply("❌ Failed to fetch positions. Please try again.");
    }

    await safeAnswerCallbackQuery(ctx);
  });

  bot.callbackQuery("wallet", async (ctx: Context) => {
    try {
      const solBalance = await connection.getBalance(owner.publicKey);
      const solBalanceInSOL = (solBalance / 10 ** 9).toFixed(4);

      const keyboard = new InlineKeyboard()
        .text("View Positions", "get_positions")
        .url(
          "View Wallet in Solscan",
          `https://solscan.io/account/${owner.publicKey.toBase58()}`
        );

      const message = `
  <b>💰 Wallet Summary</b>
  <b>SOL Balance:</b> ${solBalanceInSOL} SOL
  
  Use the buttons below for more actions.
      `;

      await ctx.reply(message, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } catch (error) {
      console.error("Error in /menu command:", error);
      await ctx.reply(
        "❌ Failed to fetch wallet information. Please try again."
      );
    }

    await safeAnswerCallbackQuery(ctx);
  });

  bot.callbackQuery(/^sell_(.+)_(.+)$/, async (ctx: Context) => {
    if (ctx.match === undefined) return;
    const amount = ctx.match[1];
    const solanaAddress = ctx.match[2];

    if (!amount || !solanaAddress) {
      await ctx.reply("Invalid buy request.");
      await ctx.answerCallbackQuery(); // Acknowledge the button press
      return;
    }

    try {
      const swapAmount = parseFloat(amount); // Convert SOL to lamports (1 SOL = 1e9 lamports)

      // Execute the swap
      const result = await apiSwap({
        inputMint: solanaAddress,
        outputMint: NATIVE_MINT.toBase58(),
        amount: swapAmount,
        slippage: 2, // 0.5% slippage
      });

      if (result?.status !== "success") {
        let message = `
<b>❌ ${result.reason}.</b>
      `;

        await ctx.reply(message, { parse_mode: "HTML" });
        return;
      }

      let message = `
<b>✅ Successfully sold ${amount}!</b>
<a href="https://solscan.io/tx/${result?.txId}">View on Solscan</a>
`;

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (error) {
      console.error("Swap error:", error);
      await ctx.reply("❌ Failed to complete the swap. Please try again.");
    }

    await safeAnswerCallbackQuery(ctx);
  });

  return bot;
}

async function safeAnswerCallbackQuery(ctx: Context) {
  try {
    await ctx.answerCallbackQuery(); // Acknowledge the button press
  } catch (error) {
    console.warn(
      "Warning: Failed to answer callback query. It might be too old."
    );
  }
}
