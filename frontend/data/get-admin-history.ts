import prisma from "@/lib/prisma";
import { requireAdmin } from "./requireAdmin";

export async function getAdminHistory() {
  await requireAdmin();

  const conversations = await prisma.conversation.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      gpt: {
        select: {
          id: true,
          name: true,
          image: true,
        }
      },
      messages: {
        orderBy: {
          timestamp: 'asc'
        },
        select: {
          content: true,
          role: true,
          timestamp: true,
        }
      },
      _count: {
        select: {
          messages: true
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  return conversations;
}

export type AdminHistory = Awaited<ReturnType<typeof getAdminHistory>>[0];