import prisma from "@/lib/prisma";
import { requireAdmin } from "./requireAdmin";

export async function getAdminGpts() {
  await requireAdmin();

  const data = await prisma.gpt.findMany({
    where: {
      user: {
        role: "admin"
      }
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      description: true,
      model: true,
      image: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          email: true
        }
      }
    },
  });
  return data;
}

export type AdminGpt = Awaited<ReturnType<typeof getAdminGpts>>[0];
