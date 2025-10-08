import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function UseSignOut() {
  const router = useRouter();

  const handleSignOut = async function SignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
          toast.success("signout successful");
        },
        onError: () => {
          toast.error("Error Logging out, please try again ");
        },
      },
    });
  };
  return handleSignOut;
}
