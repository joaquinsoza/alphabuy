import { InlineKeyboard } from "grammy";
import { fetchToken, TokenPair } from "./utils";

// Base58 regex for Solana token addresses (44 characters, valid base58 chars)
const SOLANA_ADDRESS_REGEX = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/;

/**
 * Extract a Solana mint address from a given text message.
 * @param {string} text - The text to scan for a Solana address.
 * @returns {string|null} - The found address, or null if none exists.
 */
function extractSolanaAddress(text: string): string | null {
  const matches = text.match(SOLANA_ADDRESS_REGEX);
  return matches ? matches[0] : null;
}

async function handleMessage(
  bot: any,
  text: string,
  userId: number,
  monitoredChat: { name: string }
): Promise<void> {
  const solanaAddress = extractSolanaAddress(text);

  // If no address is found, ignore the message
  if (!solanaAddress) {
    return;
  }

  // Fetch token details
  let token: TokenPair | null;
  try {
    token = await fetchToken(solanaAddress);
    if (!token) {
      await bot.api.sendMessage(userId, "Unable to fetch token details.");
      return;
    }
  } catch (error) {
    console.log("🚀 « error:", error);
    token = null;
  }

  // Construct the main message
  let message = `
<b>${monitoredChat.name}</b>

<b>Token Information:</b>
  <b>Address:</b> ${solanaAddress}
  <b>Name:</b> ${token?.name || "Unknown"}
  <b>Symbol:</b> ${token?.symbol || "Unknown"}

<b>Pricing:</b>
  <b>Price (USD):</b> $${token?.priceUsd || "N/A"}
  <b>Price (Native):</b> ${token?.priceNative || "N/A"} SOL
  <b>Price Change (h6):</b> ${token?.priceChange?.h6 || 0}%

<b>Liquidity & Volume:</b>
  <b>Liquidity (USD):</b> $${token?.liquidity?.usd || "N/A"}
  <b>Volume (h6):</b> $${token?.volume?.h6 || "N/A"}

<b>Additional Information:</b>
  <b>Pair Created:</b> ${new Date(token?.pairCreatedAt || "").toLocaleString()}
  <b>Market Cap:</b> $${token?.marketCap || "N/A"}
  <b>FDV:</b> $${token?.fdv || "N/A"}
  `;

  if (token?.info?.websites) {
    token?.info.websites.forEach((website: { url: string; label: string }) => {
      message += `
<a href="${website.url}">${website.label}</a>
      `;
    });
  }

  if (token?.info?.socials) {
    token?.info.socials.forEach((social: { url: string; type: string }) => {
      message += `
<a href="${social.url}">${social.type}</a>
      `;
    });
  }

  // Add the buttons
  const keyboard = new InlineKeyboard()
    .text("Buy 0.1 SOL", `buy_0.1_${solanaAddress}`)
    .url("DexScreener", token?.dexscreener || "")
    .row()
    .text("Buy 0.3 SOL", `buy_0.3_${solanaAddress}`)
    .url(
      "Raydium",
      `https://raydium.io/swap/?inputMint=sol&outputMint=${solanaAddress}`
    )
    .row()
    .text("Buy 0.5 SOL", `buy_0.5_${solanaAddress}`)
    .text("Get Report", `get_report_${solanaAddress}`)
    .row()
    .text("Buy 1 SOL", `buy_1_${solanaAddress}`)
    .text("Positions", `get_positions`);

  // Send the main message
  if (token?.info?.openGraph || token?.info?.imageUrl) {
    await bot.api.sendPhoto(
      userId,
      token?.info?.openGraph || token?.info?.imageUrl || null,
      {
        caption: message,
        parse_mode: "HTML",
        reply_markup: keyboard,
      }
    );
  } else {
    await bot.api.sendMessage(userId, message, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  }
}

export { handleMessage };
