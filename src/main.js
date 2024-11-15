const PropertiesReader = require("properties-reader");
const configs = PropertiesReader("config.properties");
getProp = (bundle, key) => {
  return configs.get(`${bundle}.${key}`);
};

const { TelegramClient } = require("telegram");
const { StoreSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const { EditedMessage } = require("telegram/events/EditedMessage");
const input = require("input");

const apiId = getProp("telegram", "apiId");
const apiHash = getProp("telegram", "apiHash");
const storeSession = new StoreSession("telegram_session"); // see: https://painor.gitbook.io/gramjs/getting-started/authorization#store-session

(async () => {
  console.log("Loading interactive example...");
  const client = new TelegramClient(storeSession, apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.start({
    phoneNumber: async () => await input.text("Please enter your number: "),
    password: async () => await input.text("Please enter your password: "),
    phoneCode: async () =>
      await input.text("Please enter the code you received: "),
    onError: (err) => console.log(err),
  });
  console.log("You should now be connected.");
  client.session.save(); // Save the session to avoid logging in again

  async function eventPrint(event) {
    // see 'node_modules/telegram/tl/custom/message.d.ts'
    const message = event.message;
    const isNew = message.editDate === undefined;
    const text = message.text;
    const date = new Date(message.date * 1000);

    console.log(`The message is ${isNew ? "new" : "an update"}`);
    console.log(`The text is: ${text}`);
    console.log(`The date is: ${date}`);
  }

  // to get the chatId:
  // option 1: open telegram on a web browser, go to the chat, and look the url in the address bar
  // option 2: open telegram app, copy link to any message, it should be something like: https://t.me/c/1234567890/12345, the first number after "/c/" is the chatId
  const chatId = 5301381409;
  client.addEventHandler(eventPrint, new NewMessage({ chats: [chatId] }));
  client.addEventHandler(eventPrint, new EditedMessage({ chats: [chatId] }));
})();
