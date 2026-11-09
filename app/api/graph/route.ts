import { NextResponse } from 'next/server';
import { getGraphData } from '../../lib/knowledge';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getGraphData();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load graph data' },
      { status: 500 }
    );
  }
}
