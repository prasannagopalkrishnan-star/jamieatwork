import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    prospects: 0,
    messages: 0,
    replies: 0,
    meetings: 0,
  })
}
