'use server';

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/data/requireAdmin";
import { requireUser } from "@/data/requireUser";
import { revalidatePath } from "next/cache";

export interface ConversationData {
  title: string;
  gptId: string;
  sessionId: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  }>;
}

export async function saveConversation(conversationData: ConversationData) {
  try {
    const session = await requireUser();
    
    // Check if conversation exists for this session
    const existing = await prisma.conversation.findFirst({
      where: { sessionId: conversationData.sessionId }
    });
    
    if (existing) {
      // Update existing conversation
      const conversation = await prisma.conversation.update({
        where: { id: existing.id },
        data: {
          updatedAt: new Date(),
          messages: {
            deleteMany: {}, // Clear old messages
            create: conversationData.messages.map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
            }))
          }
        },
        include: {
          messages: true,
          gpt: {
            select: {
              name: true,
              image: true
            }
          }
        }
      });

      return { success: true, conversation };
    } else {
      // Create new conversation
      const conversation = await prisma.conversation.create({
        data: {
          title: conversationData.title,
          gptId: conversationData.gptId,
          userId: session.user.id,
          sessionId: conversationData.sessionId,
          messages: {
            create: conversationData.messages.map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
            }))
          }
        },
        include: {
          messages: true,
          gpt: {
            select: {
              name: true,
              image: true
            }
          }
        }
      });

      return { success: true, conversation };
    }
  } catch (error) {
    console.error('Error saving conversation:', error);
    return { success: false, error: 'Failed to save conversation' };
  }
}

export async function deleteConversation(conversationId: string) {
  try {
    await requireAdmin();
    
    await prisma.conversation.delete({
      where: { id: conversationId }
    });

    revalidatePath('/admin/history');
    return { success: true };
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return { success: false, error: 'Failed to delete conversation' };
  }
}

export async function deleteHistory(id: string) {
  return deleteConversation(id);
}

export async function saveAdminHistory(history: ConversationData) {
  return saveConversation(history);
}