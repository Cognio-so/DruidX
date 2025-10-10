"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  teamMemberUpdateSchema,
  teamMemberInviteSchema,
} from "@/lib/zodSchema";

export async function createInvitation(data: {
  email: string;
  name: string;
  role: string;
  message?: string;
}) {
  const validatedFields = teamMemberInviteSchema.safeParse(data);

  if (!validatedFields.success) {
    throw new Error("Validation failed: " + validatedFields.error.message);
  }

  const { email, name, role, message } = validatedFields.data;

  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      email,
      status: "pending",
    },
  });

  if (existingInvitation) {
    throw new Error("Pending invitation already exists for this email");
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await prisma.invitation.create({
    data: {
      email,
      name,
      role,
      message: message || undefined,
      token,
      expiresAt,
      status: "pending",
    },
  });

  const invitationToken = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

  try {
    const emailResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/teams/invite`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          name,
          role,
          message,
          invitationToken,
        }),
      }
    );

    if (!emailResponse.ok) {
      throw new Error("Failed to send invitation email");
    }
  } catch (error) {
    await prisma.invitation.delete({
      where: { id: invitation.id },
    });
    throw new Error("Failed to send invitation email");
  }

  revalidatePath("/admin/teams");
  return { success: true, invitation };
}

export async function updateUser(
  userId: string,
  data: {
    name: string;
    email: string;
    role: string;
  }
) {
  const validatedFields = teamMemberUpdateSchema.safeParse(data);

  if (!validatedFields.success) {
    throw new Error("Validation failed: " + validatedFields.error.message);
  }

  const { name, email, role } = validatedFields.data;

  const existingUser = await prisma.user.findFirst({
    where: {
      email,
      id: { not: userId },
    },
  });

  if (existingUser) {
    throw new Error("Email is already taken by another user");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      email,
      role,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/admin/teams");
  return { success: true, user: updatedUser };
}

export async function deleteUser(userId: string) {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  revalidatePath("/admin/teams");
  return { success: true };
}

export async function getInvitation(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (new Date() > invitation.expiresAt) {
    throw new Error("Invitation has expired");
  }

  return invitation;
}

export async function acceptInvitation(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.status === "accepted") {
    throw new Error("Invitation already accepted");
  }

  if (new Date() > invitation.expiresAt) {
    throw new Error("Invitation has expired");
  }

  await prisma.invitation.update({
    where: { token },
    data: {
      status: "accepted",
      acceptedAt: new Date(),
    },
  });

  return { success: true };
}
