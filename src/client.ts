import { TelegramClient } from "telegram";
import { NewMessage, NewMessageEvent } from "telegram/events";
import { handleMessage } from "./solana";
import { ExtendedBot, MonitoredChats } from "./bot";
import { Theme } from "@inquirer/core";
import { PartialDeep, Context } from "@inquirer/type";

async function getChatName(
  client: TelegramClient,
  chatId: string
): Promise<string> {
  try {
    //TODO: FIX HERE
    const entity = await client.getEntity(chatId);
    // @ts-ignore
    return entity.title || entity.username || "Unknown";
  } catch (err) {
    console.error(`Failed to fetch chat name for ID ${chatId}:`, err);
    return "Unknown";
  }
}

async function setupClient(
  apiId: number,
  apiHash: string,
  storeSession: any,
  input: {
    (
      config: {
        message: string;
        default?: string;
        required?: boolean;
        transformer?: (
          value: string,
          { isFinal }: { isFinal: boolean }
        ) => string;
        validate?: (
          value: string
        ) => boolean | string | Promise<string | boolean>;
        theme?: PartialDeep<Theme>;
      },
      context?: Context
    ): Promise<string> & { cancel: () => void };
    (arg0: { message: string }): string | PromiseLike<string>;
  },
  bot: ExtendedBot,
  monitoredChats: MonitoredChats
): Promise<TelegramClient> {
  const client = new TelegramClient(storeSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () =>
      await input({ message: "Please enter your number: " }),
    password: async () =>
      await input({ message: "Please enter your password: " }),
    phoneCode: async () =>
      await input({ message: "Please enter the code you received: " }),
    onError: (err: Error) => console.log("Error during login:", err),
  });

  console.log("Successfully connected to Telegram!");
  client.session.save(); // Save the session for reuse

  const me = await client.getMe();
  bot.clientMeId = me.id;

  // Listen for Messages in Added Chats
  client.addEventHandler(async (event: NewMessageEvent) => {
    const message = event.message;
    const chatId = String(message.chatId);
    const text = message.text || "Non-text message received";

    // Process the message for each monitored chat
    for (const [userId, chatList] of Object.entries(monitoredChats)) {
      const monitoredChat = chatList.find((chat) => chat.id === chatId);
      if (monitoredChat) {
        // handle received message
        handleMessage(bot, text, Number(userId), monitoredChat);
      }
    }
  }, new NewMessage());

  return client;
}

export { setupClient, getChatName };
