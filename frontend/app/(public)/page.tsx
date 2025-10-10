import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/themeToggle";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    if (session.user.role === "admin") {
      return redirect("/admin");
    } else {
      return redirect("/dashboard");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="flex flex-col justify-between items-center">
        <Link
          href={"/login"}
          className={buttonVariants({
            variant: "outline",
          })}
        >
          Get Started
        </Link>
        <ThemeToggle />
      </div>
    </div>
  );
}
