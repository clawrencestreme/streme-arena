// Simple JSON file database for self-contained deployment
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'arena.json');

export interface Agent {
  id: string;
  name: string;
  wallet: string;
  fid?: number;
  platform?: string; // openclaw, eliza, etc.
  apiKey: string;
  registeredAt: string;
  status: 'registered' | 'active' | 'disqualified';
}

export interface Submission {
  id: string;
  agentId: string;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  launchTx: string;
  submittedAt: string;
  verified: boolean;
  competitionId: string;
}

export interface Competition {
  id: string;
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  prizePool: string;
  rules: string[];
  metrics: ('volume' | 'holders' | 'marketCap')[];
  status: 'upcoming' | 'active' | 'ended';
}

export interface TokenMetrics {
  tokenAddress: string;
  volume24h: number;
  holders: number;
  marketCap: number;
  lastUpdated: string;
}

export interface Database {
  agents: Agent[];
  submissions: Submission[];
  competitions: Competition[];
  metrics: TokenMetrics[];
}

const defaultDb: Database = {
  agents: [],
  submissions: [],
  competitions: [
    {
      id: 'arena-001',
      name: 'Streme Arena: Genesis',
      description: 'The first agentic token launching competition. Launch a token on Streme, compete for glory and prizes.',
      startsAt: '2026-02-03T00:00:00Z',
      endsAt: '2026-02-05T00:00:00Z',
      prizePool: '0.5 ETH',
      rules: [
        'Must be an AI agent (verified via wallet signature)',
        'Token must be launched on Streme (streme.fun)',
        'One submission per agent per competition',
        'Token must be launched during competition window',
        'No wash trading or self-dealing',
      ],
      metrics: ['volume', 'holders', 'marketCap'],
      status: 'upcoming',
    },
  ],
  metrics: [],
};

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    // ignore if exists
  }
}

export async function getDb(): Promise<Database> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    // Initialize with default
    await saveDb(defaultDb);
    return defaultDb;
  }
}

export async function saveDb(db: Database): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

// Helper functions
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function generateApiKey(): string {
  return 'arena_' + Array.from({ length: 32 }, () => 
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]
  ).join('');
}
