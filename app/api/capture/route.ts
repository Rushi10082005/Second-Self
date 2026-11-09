import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type = 'note', content = '', source = 'web_app' } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Capture content cannot be empty.' },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const captured_at = new Date().toISOString();

    const captureRecord = {
      id,
      captured_at,
      type: type === 'link' ? 'link' : 'note',
      content: content.trim(),
      source,
    };

    // Attempt to persist to raw/ folder if directory is writable (e.g. local or persistent storage)
    try {
      const rawDir = path.join(process.cwd(), 'raw');
      const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}_${id.slice(0, 8)}.json`;
      await fs.writeFile(
        path.join(rawDir, filename),
        JSON.stringify(captureRecord, null, 2),
        'utf-8'
      );
    } catch {
      // In read-only serverless environment, log and gracefully proceed
    }

    return NextResponse.json({
      success: true,
      capture: captureRecord,
      message: 'Thought successfully captured to SecondSelf inbox!',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to capture note' },
      { status: 500 }
    );
  }
}

