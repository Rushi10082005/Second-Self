import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

export interface WikiNoteItem {
  slug: string;
  title: string;
  para: 'Projects' | 'Areas' | 'Resources' | 'Archives';
  summary: string;
  tags: string[];
  content: string;
  links: string[];
  capture_id?: string;
  captured_at?: string;
}

export interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    para: 'Projects' | 'Areas' | 'Resources' | 'Archives';
    summary?: string;
    excerpt?: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: 'similarity' | 'explicit_link';
    weight: number;
  }>;
  meta: {
    note_count: number;
    edge_count: number;
    generated_at?: string;
  };
}

export async function getGraphData(): Promise<GraphData> {
  try {
    const graphPath = path.join(process.cwd(), 'data', 'graph.json');
    const raw = await fs.readFile(graphPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to load data/graph.json, attempting fallback', err);
    return {
      nodes: [],
      edges: [],
      meta: { note_count: 0, edge_count: 0 },
    };
  }
}

export async function getAllWikiNotes(): Promise<WikiNoteItem[]> {
  const wikiDir = path.join(process.cwd(), 'wiki');
  const categories: Array<'Projects' | 'Areas' | 'Resources' | 'Archives'> = [
    'Projects',
    'Areas',
    'Resources',
    'Archives',
  ];
  const notes: WikiNoteItem[] = [];

  for (const cat of categories) {
    const catDir = path.join(wikiDir, cat);
    try {
      const files = await fs.readdir(catDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const filePath = path.join(catDir, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const parsed = matter(fileContent);
        const slug = file.replace(/\.md$/, '');

        notes.push({
          slug,
          title: parsed.data.title || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          para: (parsed.data.para_category as any) || cat,
          summary: parsed.data.summary || '',
          tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : [],
          links: Array.isArray(parsed.data.links) ? parsed.data.links : [],
          content: parsed.content.trim(),
          capture_id: parsed.data.capture_id,
          captured_at: parsed.data.captured_at,
        });
      }
    } catch {
      // directory might be empty or missing
    }
  }

  return notes;
}
