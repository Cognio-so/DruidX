import prisma from "@/lib/prisma";
import { requireUser } from "./requireUser";

export async function getGpts() {
    await requireUser();

    const data = await prisma.gpt.findMany({
        orderBy: {
            createdAt: "desc"
        },
        select: {
            id: true,
            name: true,
            description: true,
            mcp: true,
            webBrowser: true, 
            hybridRag: true, // Added hybridRag field
            model: true,
            image: true, 
            createdAt: true,
            updatedAt: true,
        },
    });
    return data;
}

export type Gpt = Awaited<ReturnType<typeof getGpts>>[0];