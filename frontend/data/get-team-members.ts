import prisma from "@/lib/prisma";
import { requireUser } from "./requireUser";

export async function getTeamMembers() {
  await requireUser();

  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return users;
}

export type TeamMember = Awaited<ReturnType<typeof getTeamMembers>>[0];
