import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

type PresetId = 'A' | 'B' | 'C';

type ExtensionSyncRecord = {
  presetId: PresetId;
  settings: Record<string, unknown>;
  source: 'web' | 'extension';
  syncedAt: string;
  syncVersion: number;
};

function readExtensionSync(preset: unknown): ExtensionSyncRecord | null {
  if (!preset || typeof preset !== 'object') return null;

  const raw = (preset as Record<string, unknown>).extensionSync;
  if (!raw || typeof raw !== 'object') return null;

  const record = raw as Record<string, unknown>;
  const presetId = record.presetId;
  const syncedAt = record.syncedAt;
  const syncVersion = record.syncVersion;
  const source = record.source;
  const settings = record.settings;

  if (presetId !== 'A' && presetId !== 'B' && presetId !== 'C') return null;
  if (typeof syncedAt !== 'string') return null;
  if (typeof syncVersion !== 'number') return null;
  if (source !== 'web' && source !== 'extension') return null;
  if (!settings || typeof settings !== 'object') return null;

  return {
    presetId,
    syncedAt,
    syncVersion,
    source,
    settings: settings as Record<string, unknown>,
  };
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('preset')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const extensionSync = readExtensionSync(data?.preset ?? null);
    if (!extensionSync) {
      return NextResponse.json({ synced: false, extensionSync: null });
    }

    return NextResponse.json({ synced: true, extensionSync });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected extension sync read error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    const presetId = body?.presetId;
    const source = body?.source === 'extension' ? 'extension' : 'web';
    const settings = body?.settings;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (presetId !== 'A' && presetId !== 'B' && presetId !== 'C') {
      return NextResponse.json({ error: 'presetId must be A, B, or C' }, { status: 400 });
    }

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'settings must be an object' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const existingProfile = await supabase
      .from('user_profiles')
      .select('preset')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingProfile.error) {
      return NextResponse.json({ error: existingProfile.error.message }, { status: 500 });
    }

    const existingPreset =
      existingProfile.data?.preset && typeof existingProfile.data.preset === 'object'
        ? (existingProfile.data.preset as Record<string, unknown>)
        : {};

    const existingSync = readExtensionSync(existingPreset);
    const nextSyncVersion = (existingSync?.syncVersion ?? 0) + 1;
    const syncedAt = new Date().toISOString();

    const extensionSync: ExtensionSyncRecord = {
      presetId,
      source,
      syncedAt,
      syncVersion: nextSyncVersion,
      settings: settings as Record<string, unknown>,
    };

    const nextPreset = {
      ...existingPreset,
      extensionSync,
    };

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(
        {
          user_id: userId,
          preset: nextPreset,
          updated_at: syncedAt,
        },
        { onConflict: 'user_id' }
      )
      .select('preset')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      synced: true,
      extensionSync: readExtensionSync(data?.preset ?? null),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected extension sync write error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
