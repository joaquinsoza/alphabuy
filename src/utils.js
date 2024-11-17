const axios = require("axios");

async function fetchReport(address) {
  const url = `https://api.rugcheck.xyz/v1/tokens/${address}/report`;
  const response = await axios.get(url);
  return {
    supply: response.data.token.supply,
    decimals: response.data.token.decimals,
    name: response.data.tokenMeta.name,
    symbol: response.data.tokenMeta.symbol,
    image: response.data.fileMeta.image,
    uri: response.data.tokenMeta.uri,
    mutable: response.data.tokenMeta.mutable,
    topHolders: response.data.topHolders,
    risks: response.data.risks,
    score: response.data.score,
    markets: response.data.markets,
    rugged: response.data.rugged,
  };
}

async function fetchToken(address) {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${address}`;
  const response = await axios.get(url);

  // TODO: If there are multiple pairs there could be an arbitrage opportunity
  // For now i will just consider raydium and return one pair info

  const raydiumPairs = response.data.pairs.filter(
    (pair) => pair.dexId === "raydium"
  );

  const raydiumSolPair = raydiumPairs.find(
    (pair) =>
      pair.quoteToken.address === "So11111111111111111111111111111111111111112"
  );

  return {
    dexId: raydiumSolPair.dexId,
    dexscreener: raydiumSolPair.url,
    pairAddress: raydiumSolPair.pairAddress,
    name: raydiumSolPair.baseToken.name,
    symbol: raydiumSolPair.baseToken.symbol,
    priceNative: raydiumSolPair.priceNative,
    priceUsd: raydiumSolPair.priceUsd,
    txns: raydiumSolPair.txns,
    volume: raydiumSolPair.volume,
    priceChange: raydiumSolPair.priceChange,
    liquidity: raydiumSolPair.liquidity,
    fdv: raydiumSolPair.fdv,
    marketCap: raydiumSolPair.marketcap,
    pairCreatedAt: raydiumSolPair.pairCreatedAt,
    info: raydiumSolPair.info,
  };
}

module.exports = {
  fetchReport,
  fetchToken,
};
