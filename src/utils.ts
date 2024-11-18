import axios from "axios";
import { NATIVE_MINT } from "@solana/spl-token";

export interface Report {
  supply: number;
  decimals: number;
  name: string;
  symbol: string;
  image: string;
  uri: any;
  mutable: boolean;
  topHolders: any[];
  risks: any[];
  score: number;
  markets: any[];
  rugged: boolean;
}

export interface TokenPair {
  dexId: string;
  dexscreener: string;
  pairAddress: string;
  name: string;
  symbol: string;
  priceNative: number;
  priceUsd: number;
  txns: any;
  volume: any;
  priceChange: any;
  liquidity: any;
  fdv: number;
  marketCap: number;
  pairCreatedAt: string;
  info: any;
}

export async function fetchReport(address: string): Promise<Report> {
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

export async function fetchToken(address: string): Promise<TokenPair> {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${address}`;
  const response = await axios.get(url);

  const raydiumPairs = response.data.pairs.filter(
    (pair: any) => pair.dexId === "raydium"
  );

  const raydiumSolPair = raydiumPairs.find(
    (pair: any) => pair.quoteToken.address === NATIVE_MINT.toBase58()
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
