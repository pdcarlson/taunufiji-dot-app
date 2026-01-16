
import { NextResponse } from 'next/server';
import nacl from 'tweetnacl';

export async function POST(req: Request) {
  const { env } = await import('@/lib/config/env');
  
  // 1. Validate Signature
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  const body = await req.text(); // Raw body needed for verification

  if (!signature || !timestamp || !validateSignature(body, signature, timestamp, env.DISCORD_PUBLIC_KEY)) {
    return NextResponse.json({ error: 'Invalid request signature' }, { status: 401 });
  }

  // 2. Parse Body
  const interaction = JSON.parse(body);

  // 3. Handle PING (Type 1)
  if (interaction.type === 1) {
    return NextResponse.json({ type: 1 });
  }

  // 4. Handle COMMAND (Type 2)
  if (interaction.type === 2) {
      const { name, options } = interaction.data;
      const { handleCommand } = await import('@/lib/discord/commands');
      const response = await handleCommand(name, options);
      return NextResponse.json(response);
  }

  return NextResponse.json({ error: 'Unknown Type' }, { status: 400 });
}

function validateSignature(body: string, signature: string, timestamp: string, publicKey: string): boolean {
  try {
    const isVerified = nacl.sign.detached.verify(
      Buffer.from(timestamp + body),
      Buffer.from(signature, 'hex'),
      Buffer.from(publicKey, 'hex')
    );
    return isVerified;
  } catch (e) {
    return false;
  }
}
