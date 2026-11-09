import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const apiKeyOverride = formData.get('apiKey') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No audio file provided in request' },
        { status: 400 }
      );
    }

    const groqApiKey = apiKeyOverride || process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not configured on the server or in request settings.' },
        { status: 401 }
      );
    }

    const groq = new Groq({ apiKey: groqApiKey });

    // Transcribe with Groq Whisper Large v3 Turbo
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3-turbo',
      response_format: 'json',
      temperature: 0.0,
    });

    return NextResponse.json({
      success: true,
      text: transcription.text,
    });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}

