const { TelegramClient } = require("telegram");
const { NewMessage } = require("telegram/events");
const { handleMessage } = require("./solana");

async function getChatName(client, chatId) {
  try {
    const entity = await client.getEntity(chatId);
    return entity.title || entity.username || "Unknown";
  } catch (err) {
    console.error(`Failed to fetch chat name for ID ${chatId}:`, err);
    return "Unknown";
  }
}

async function setupClient(
  apiId,
  apiHash,
  storeSession,
  input,
  bot,
  monitoredChats
) {
  const client = new TelegramClient(storeSession, apiId, apiHash, {
    connectionRetries: 5,
  });

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
  client.addEventHandler(async (event) => {
    const message = event.message;
    const chatId = String(message.chatId);
    const text = message.text || "Non-text message received";

    // Process the message for each monitored chat
    for (const [userId, chatList] of Object.entries(monitoredChats)) {
      const monitoredChat = chatList.find((chat) => chat.id === chatId);
      if (monitoredChat) {
        // handle received message
        handleMessage(bot, text, userId, monitoredChat);
      }
    }
  }, new NewMessage());

  return client;
}

module.exports = { setupClient, getChatName };
