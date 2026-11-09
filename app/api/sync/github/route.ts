import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      path: filePath,
      content,
      message,
      token: userToken,
      repo: userRepo,
      branch = 'main',
    } = body;

    const token = userToken || process.env.GITHUB_TOKEN;
    const repo = (userRepo || process.env.GITHUB_REPO || 'Rushi10082005/Second-Self').trim();

    if (!token) {
      return NextResponse.json(
        {
          error: 'GitHub Personal Access Token is required to commit changes.',
          needs_token: true,
        },
        { status: 400 }
      );
    }

    if (!filePath || !content) {
      return NextResponse.json(
        { error: 'File path and content are required for GitHub sync.' },
        { status: 400 }
      );
    }

    const cleanPath = filePath.replace(/^\/+/, '');
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${cleanPath}`;

    // 1. Check if the file already exists on GitHub to fetch its SHA
    let existingSha: string | undefined;
    const getRes = await fetch(`${apiUrl}?ref=${branch}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'SecondSelf-AI-PKM',
      },
    });

    if (getRes.ok) {
      const getData = await getRes.json();
      existingSha = getData.sha;
    }

    // 2. Commit the new / updated content directly to GitHub via REST API
    const base64Content = Buffer.from(content, 'utf-8').toString('base64');
    const commitMessage = message || `feat(vault): auto-sync note ${cleanPath} via SecondSelf`;

    const putPayload: Record<string, any> = {
      message: commitMessage,
      content: base64Content,
      branch,
    };

    if (existingSha) {
      putPayload.sha = existingSha;
    }

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'SecondSelf-AI-PKM',
      },
      body: JSON.stringify(putPayload),
    });

    const putData = await putRes.json();

    if (!putRes.ok) {
      return NextResponse.json(
        {
          error: putData.message || 'Failed to commit file to GitHub',
          details: putData,
        },
        { status: putRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${cleanPath} to GitHub repository!`,
      commit_sha: putData.commit?.sha,
      html_url: putData.content?.html_url,
      path: cleanPath,
    });
  } catch (error: any) {
    console.error('GitHub Sync API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal GitHub sync error' },
      { status: 500 }
    );
  }
}

