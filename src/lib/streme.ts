// Streme verification - check if token was deployed via Streme

export interface StremeToken {
  address: string;
  name: string;
  symbol: string;
  deployer: string;
  createdAt: string;
  image?: string;
}

const STREME_API = 'https://api.streme.fun/api';

export async function verifyStremeToken(tokenAddress: string): Promise<StremeToken | null> {
  try {
    const response = await fetch(`${STREME_API}/tokens/${tokenAddress}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Token not found on Streme
      }
      console.error('Streme API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    // Token exists on Streme = verified
    return {
      address: data.address || tokenAddress,
      name: data.name,
      symbol: data.symbol,
      deployer: data.deployer || data.creator,
      createdAt: data.createdAt || data.created_at,
      image: data.image,
    };
  } catch (error) {
    console.error('Error verifying Streme token:', error);
    return null;
  }
}

// Alternative: check if deployer is Streme's factory (backup verification)
export async function verifyStremeDeployer(tokenAddress: string): Promise<boolean> {
  const STREME_DEPLOYERS = [
    '0x8712F62B3A2EeBA956508e17335368272f162748', // STREME_PUBLIC_DEPLOYER_V2
    '0xB973FDd29c99da91CAb7152EF2e82090507A1ce9', // STREME_SUPER_TOKEN_FACTORY
  ];

  try {
    // Get token creation tx and check deployer
    const response = await fetch(
      `https://api.basescan.org/api?module=contract&action=getcontractcreation&contractaddresses=${tokenAddress}&apikey=YourApiKeyToken`
    );
    
    if (!response.ok) return false;
    
    const data = await response.json();
    if (data.status !== '1' || !data.result?.[0]) return false;
    
    const creator = data.result[0].contractCreator?.toLowerCase();
    return STREME_DEPLOYERS.some(d => d.toLowerCase() === creator);
  } catch (error) {
    console.error('Error checking deployer:', error);
    return false;
  }
}
