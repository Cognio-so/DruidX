'use server';

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteGptbyId(id: string) {
    try {
        await prisma.gpt.delete({
            where: {
                id
            }
        });
        
        revalidatePath("/admin/gpts");
        
        return {
            success: true,
            message: "GPT deleted successfully"
        };   
    } catch (error) {
        console.error("Error deleting GPT:", error);
        return {
            success: false,
            message: "Failed to delete GPT"
        };
    }
}