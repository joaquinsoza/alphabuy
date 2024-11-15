// Base58 regex for Solana token addresses (44 characters, valid base58 chars)
const SOLANA_ADDRESS_REGEX = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/;

/**
 * Extract a Solana mint address from a given text message.
 * @param {string} text - The text to scan for a Solana address.
 * @returns {string|null} - The found address, or null if none exists.
 */
function extractSolanaAddress(text) {
  const matches = text.match(SOLANA_ADDRESS_REGEX);
  return matches ? matches[0] : null;
}

module.exports = {
  extractSolanaAddress,
};
