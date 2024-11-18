import {
  Transaction,
  VersionedTransaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import axios from "axios";
import { API_URLS } from "@raydium-io/raydium-sdk-v2";
import { config, connection, fetchTokenAccountData, owner } from "./config";

interface SwapCompute {
  id: string;
  success: true;
  version: "V0" | "V1";
  openTime?: undefined;
  msg: undefined;
  data: {
    swapType: "BaseIn" | "BaseOut";
    inputMint: string;
    inputAmount: string;
    outputMint: string;
    outputAmount: string;
    otherAmountThreshold: string;
    slippageBps: number;
    priceImpactPct: number;
    routePlan: {
      poolId: string;
      inputMint: string;
      outputMint: string;
      feeMint: string;
      feeRate: number;
      feeAmount: string;
    }[];
  };
}

interface SwapTransaction {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippage: number;
}

export const apiSwap = async ({
  inputMint,
  outputMint,
  amount,
  slippage,
}: SwapTransaction) => {
  console.log("🚀 « slippage:", slippage);
  console.log("🚀 « amount:", amount);
  console.log("🚀 « outputMint:", outputMint);
  console.log("🚀 « inputMint:", inputMint);

  const txVersion: string = "V0"; // or LEGACY
  const isV0Tx = txVersion === "V0";

  const [isInputSol, isOutputSol] = [
    inputMint === NATIVE_MINT.toBase58(),
    outputMint === NATIVE_MINT.toBase58(),
  ];

  const { tokenAccounts } = await fetchTokenAccountData();
  const inputTokenAcc = tokenAccounts.find(
    (a) => a.mint.toBase58() === inputMint
  )?.publicKey;

  // Check if input token account exists (except for SOL)
  if (!inputTokenAcc && !isInputSol) {
    console.error("Error: Input token account does not exist.");
    return {
      status: "failed",
      reason: "Input token account does not exist.",
    };
  }

  // Fetch balance for the input token or SOL
  const balance = isInputSol
    ? await connection.getBalance(owner.publicKey)
    : null;

  // Convert amount to lamports for comparison
  const requiredAmount = amount;

  if (isInputSol && balance! < requiredAmount) {
    console.error("Error: Insufficient balance.");
    return {
      status: "failed",
      reason: "Insufficient balance.",
    };
  }

  // Fetch statistical transaction fee from API
  const { data } = await axios.get<{
    id: string;
    success: boolean;
    data: { default: { vh: number; h: number; m: number } };
  }>(`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`);
  console.log("🚀 « data:", data);

  const { data: swapResponse } = await axios.get<SwapCompute>(
    `${
      API_URLS.SWAP_HOST
    }/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${
      slippage * 100
    }&txVersion=${txVersion}`
  );

  console.log("🚀 « swapResponse:", swapResponse);

  const { data: swapTransactions } = await axios.post<{
    id: string;
    version: string;
    success: boolean;
    data: { transaction: string }[];
  }>(`${API_URLS.SWAP_HOST}/transaction/swap-base-in`, {
    computeUnitPriceMicroLamports: String(data.data.default.h),
    swapResponse,
    txVersion,
    wallet: owner.publicKey.toBase58(),
    wrapSol: isInputSol,
    unwrapSol: isOutputSol,
    inputAccount: isInputSol ? undefined : inputTokenAcc?.toBase58(),
    outputAccount: isOutputSol ? undefined : inputTokenAcc?.toBase58(),
  });

  const allTxBuf = swapTransactions.data.map((tx) =>
    Buffer.from(tx.transaction, "base64")
  );
  const allTransactions = allTxBuf.map((txBuf) =>
    isV0Tx ? VersionedTransaction.deserialize(txBuf) : Transaction.from(txBuf)
  );

  console.log(`total ${allTransactions.length} transactions`, swapTransactions);

  let status;
  let reason;
  let endTxId;

  let idx = 0;
  if (!isV0Tx) {
    for (const tx of allTransactions) {
      console.log(`${++idx} transaction sending...`);
      const transaction = tx as Transaction;
      transaction.sign(owner);
      const txId = await sendAndConfirmTransaction(
        connection,
        transaction,
        [owner],
        { skipPreflight: true }
      );
      endTxId = txId;
      console.log(`${++idx} transaction confirmed, txId: ${txId}`);
    }
  } else {
    for (const tx of allTransactions) {
      idx++;
      const transaction = tx as VersionedTransaction;
      transaction.sign([owner]);
      const txId = await connection.sendTransaction(
        tx as VersionedTransaction,
        { skipPreflight: true }
      );
      const { lastValidBlockHeight, blockhash } =
        await connection.getLatestBlockhash({
          commitment: "finalized",
        });
      console.log(`${idx} transaction sending..., txId: ${txId}`);
      endTxId = txId;
      if (config.solanaRpc?.includes("alchemy"))
        return { status: "success", reason: "success", txId: endTxId };
      const res = await connection.confirmTransaction(
        {
          blockhash,
          lastValidBlockHeight,
          signature: txId,
        },
        "confirmed"
      );
      console.log("🚀 « res:", res);
      if (res.value.err) {
        status = "failed";
        reason = res.value.err;
      } else {
        status = "success";
      }
      console.log(`${idx} transaction confirmed`);
    }
  }

  return {
    status,
    reason,
    txId: endTxId,
  };
};
