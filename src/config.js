const PropertiesReader = require("properties-reader");
const configs = PropertiesReader("config.properties");

function getProp(bundle, key) {
  return configs.get(`${bundle}.${key}`);
}

module.exports = {
  apiId: getProp("telegram", "apiId"),
  apiHash: getProp("telegram", "apiHash"),
  apiBot: getProp("telegram-bot", "api"),
};
