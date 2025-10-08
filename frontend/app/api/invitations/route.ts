import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email, name, role, message, token, expiresAt } = await request.json();

    if (!email || !name || !role || !token || !expiresAt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if invitation already exists for this email
    const existingInvitation = await prisma.Invitation.findFirst({
      where: {
        email,
        status: 'pending',
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Pending invitation already exists for this email' },
        { status: 400 }
      );
    }

    const invitation = await prisma.Invitation.create({
      data: {
        email,
        name,
        role,
        message,
        token,
        expiresAt: new Date(expiresAt),
        status: 'pending',
      },
    });

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
