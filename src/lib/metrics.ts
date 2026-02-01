// Fetch token metrics from DexScreener

export interface TokenMetricsData {
  volume24h: number;
  holders: number;
  marketCap: number;
  priceUsd: number;
  liquidity: number;
}

export async function fetchTokenMetrics(tokenAddress: string): Promise<TokenMetricsData | null> {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );

    if (!response.ok) {
      console.error('DexScreener API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data.pairs || data.pairs.length === 0) {
      return null;
    }

    // Get the main pair (highest liquidity on Base)
    const basePairs = data.pairs.filter((p: any) => p.chainId === 'base');
    if (basePairs.length === 0) {
      return null;
    }

    const mainPair = basePairs.sort((a: any, b: any) => 
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    )[0];

    return {
      volume24h: mainPair.volume?.h24 || 0,
      holders: 0, // DexScreener doesn't provide holder count directly
      marketCap: mainPair.marketCap || mainPair.fdv || 0,
      priceUsd: parseFloat(mainPair.priceUsd) || 0,
      liquidity: mainPair.liquidity?.usd || 0,
    };
  } catch (error) {
    console.error('Error fetching token metrics:', error);
    return null;
  }
}

// Fetch holder count from Basescan (if available)
export async function fetchHolderCount(tokenAddress: string): Promise<number> {
  // For now, return 0 - would need Basescan API key for accurate count
  // Could also query the contract directly
  return 0;
}
