"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useSignOut() {
  const router = useRouter();

  const HandleSignOut = async function SignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
          toast.success("Logout Successful");
        },
        onError: () => {
          toast.error("Error logging out. Please try again.");
        },
      },
    });
  };
  return HandleSignOut;
}
