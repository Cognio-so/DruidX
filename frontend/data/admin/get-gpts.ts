import prisma from "@/lib/prisma";
import { requireUser } from "./require-user";

export async function GetGpts() {
  await requireUser();

  const data = prisma.gpt.findMany({
    orderBy: {
      createdAt: "desc",
    },

    select: {
      id: true,
      name: true,
      description: true,
      mcp: true,
      webBrowser: true,
      model: true,
      image: true,
      createdAt: true,
    },
  });
  return data;
}

export type GptType = Awaited<ReturnType<typeof GetGpts>>[0];
