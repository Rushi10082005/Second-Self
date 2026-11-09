import { NextRequest, NextResponse } from 'next/server';
import { getAllWikiNotes } from '../../lib/knowledge';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const paraFilter = searchParams.get('para');
    const query = searchParams.get('q')?.toLowerCase();

    let notes = await getAllWikiNotes();

    if (paraFilter && paraFilter !== 'all') {
      notes = notes.filter(
        (n) => n.para.toLowerCase() === paraFilter.toLowerCase()
      );
    }

    if (query) {
      notes = notes.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.summary.toLowerCase().includes(query) ||
          n.tags.some((t) => t.toLowerCase().includes(query)) ||
          n.content.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({
      total: notes.length,
      notes,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch wiki notes' },
      { status: 500 }
    );
  }
}
