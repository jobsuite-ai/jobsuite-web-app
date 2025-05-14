import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: any }) {
    return NextResponse.json({ message: 'This API is not implemented' });
}
