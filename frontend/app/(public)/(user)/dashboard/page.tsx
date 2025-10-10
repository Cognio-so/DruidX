"use client";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function Dashboard() {

  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  }

  return <div> 
    <div className="flex flex-col gap-4 justify-center items-center h-screen">
      <h1 className="text-2xl font-bold">User Dashboard</h1>
      <Button onClick={handleSignOut}>
        logout
      </Button>
    </div>
  </div>;
}