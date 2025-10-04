import { ReactNode } from "react";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="">
      <main className="">{children}</main>
    </div>
  );
}
