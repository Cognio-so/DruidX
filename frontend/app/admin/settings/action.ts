'use server';

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/data/requireAdmin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getUserDetails() {
  try {
    const session = await requireAdmin();
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, user };
  } catch (error) {
    console.error('Error fetching user details:', error);
    return { success: false, error: 'Failed to fetch user details' };
  }
}

export async function updateProfile(formData: FormData) {
  try {
    const session = await requireAdmin();
    
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;

    if (!name || !email) {
      throw new Error('Name and email are required');
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        email: email,
        id: { not: session.user.id }
      }
    });

    if (existingUser) {
      throw new Error('Email is already taken');
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { name, email }
    });

    revalidatePath('/admin/settings');
    redirect('/admin/settings?success=Profile updated successfully');
    
  } catch (error) {
    console.error('Error updating profile:', error);
    redirect(`/admin/settings?error=${encodeURIComponent(error instanceof Error ? error.message : 'Failed to update profile')}`);
  }
}