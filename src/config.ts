import PropertiesReader from "properties-reader";

const configs = PropertiesReader("config.properties");

function getProp(bundle: string, key: string): string | undefined {
  return configs.get(`${bundle}.${key}`) as string | undefined;
}

export const config = {
  apiId: getProp("telegram", "apiId") ?? "",
  apiHash: getProp("telegram", "apiHash") ?? "",
  apiBot: getProp("telegram-bot", "api") ?? "",
  solanaKey: getProp("solana", "key"),
  solanaRpc: getProp("solana", "rpc"),
};
