import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/themeToggle";
import Link from "next/link";

export default function Home() {
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
