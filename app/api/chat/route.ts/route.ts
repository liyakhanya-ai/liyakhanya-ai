import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  console.log('ROUTE WORKS!')
  return NextResponse.json({ answer: "Hello from Liyakhanya AI - route is working!" })
}