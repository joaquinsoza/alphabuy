const { TelegramClient } = require("telegram");
const { StoreSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");

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

    // Relay messages only from monitored chats
    for (const [userId, chatIds] of Object.entries(monitoredChats)) {
      if (chatIds.includes(chatId)) {
        await bot.api.sendMessage(
          userId,
          `Message from chat ${chatId}: ${text}`
        );
      }
    }
  }, new NewMessage());

  return client;
}

module.exports = setupClient;
