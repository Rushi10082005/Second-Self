import JSZip from 'jszip';
import { WikiNoteItem, GraphData } from './knowledge';

export async function exportVaultToZip(
  notes: WikiNoteItem[],
  graphData: GraphData | null
): Promise<Blob> {
  const zip = new JSZip();

  // Root folders
  const projectsFolder = zip.folder('Projects');
  const areasFolder = zip.folder('Areas');
  const resourcesFolder = zip.folder('Resources');
  const archivesFolder = zip.folder('Archives');

  for (const note of notes) {
    const frontmatterLines = [
      '---',
      `title: "${note.title.replace(/"/g, '\\"')}"`,
      `para_category: ${note.para}`,
      `summary: "${(note.summary || '').replace(/"/g, '\\"')}"`,
      'tags:',
      ...note.tags.map((t) => `  - ${t}`),
      'links:',
      ...note.links.map((l) => `  - ${l}`),
      '---',
      '',
      note.content,
      '',
    ].join('\n');

    const filename = `${note.slug}.md`;
    if (note.para === 'Projects') {
      projectsFolder?.file(filename, frontmatterLines);
    } else if (note.para === 'Areas') {
      areasFolder?.file(filename, frontmatterLines);
    } else if (note.para === 'Archives') {
      archivesFolder?.file(filename, frontmatterLines);
    } else {
      resourcesFolder?.file(filename, frontmatterLines);
    }
  }

  // Include graph.json
  if (graphData) {
    zip.file('graph.json', JSON.stringify(graphData, null, 2));
  }

  // Include README
  zip.file(
    'README.md',
    `# SecondSelf Knowledge Vault\n\nExported on ${new Date().toISOString()}.\nTotal Notes: ${notes.length}\nCompatible with Obsidian, Logseq, and Foam.\n`
  );

  return await zip.generateAsync({ type: 'blob' });
}

export function triggerDownloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

