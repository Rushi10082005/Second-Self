import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getAllWikiNotes, WikiNoteItem } from '../../lib/knowledge';

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, title, para, summary = '', tags = [], content = '' } = body;

    if (!title || !para) {
      return NextResponse.json(
        { error: 'Note title and PARA category are required.' },
        { status: 400 }
      );
    }

    const noteSlug =
      slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') ||
      'untitled-note';

    const normalizedCategory = ['Projects', 'Areas', 'Resources', 'Archives'].includes(para)
      ? para
      : 'Resources';

    const updatedNote: WikiNoteItem = {
      slug: noteSlug,
      title: title.trim(),
      para: normalizedCategory,
      summary: summary.trim(),
      tags: Array.isArray(tags) ? tags.map((t: string) => t.trim().toLowerCase()).filter(Boolean) : [],
      links: [],
      content: content.trim(),
      captured_at: new Date().toISOString(),
    };

    // Serialize to Markdown with YAML frontmatter
    const frontmatterLines = [
      '---',
      `title: "${updatedNote.title.replace(/"/g, '\\"')}"`,
      `para_category: ${updatedNote.para}`,
      `summary: "${updatedNote.summary.replace(/"/g, '\\"')}"`,
      'tags:',
      ...updatedNote.tags.map((t) => `  - ${t}`),
      'links: []',
      '---',
      '',
      updatedNote.content,
      '',
    ].join('\n');

    // Attempt filesystem write (persistent in dev/local, ephemeral on Vercel)
    try {
      const targetDir = path.join(process.cwd(), 'wiki', normalizedCategory);
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(path.join(targetDir, `${noteSlug}.md`), frontmatterLines, 'utf-8');
    } catch (writeErr) {
      console.warn('Filesystem write notice (read-only environment):', writeErr);
    }

    return NextResponse.json({
      success: true,
      note: updatedNote,
      markdown: frontmatterLines,
      path: `wiki/${normalizedCategory}/${noteSlug}.md`,
      message: 'Note saved successfully!',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to save note' },
      { status: 500 }
    );
  }
}
