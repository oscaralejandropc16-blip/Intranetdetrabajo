export function executeDbRequest(body: any, dbUrl?: string): Promise<{ status: number; body: any }>;
export function executeFileGet(queryObj: { bucket?: string | null; path?: string | null }, dbUrl?: string): Promise<{
  status: number;
  contentType?: string;
  buffer?: Buffer;
  body?: string;
}>;
export function executeFilePost(body: any, dbUrl?: string): Promise<{ status: number; body: any }>;
