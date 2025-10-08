import { notFound, redirect } from "next/navigation";
import { getInvitation } from "@/app/admin/teams/action";
import { AcceptInvitationForm } from "./_components/accept-invitation-form";

interface InvitePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  try {
    const invitation = await getInvitation(token);

    if (invitation.status === "accepted") {
      redirect("/login?message=already-accepted");
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <AcceptInvitationForm invitation={invitation} />
      </div>
    );
  } catch {
    notFound();
  }
}
