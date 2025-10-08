"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { acceptInvitation } from "@/app/admin/teams/action";

interface Invitation {
  token: string;
  id: string;
  email: string;
  name: string;
  role: string;
  message: string | null;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt: Date | null;
  acceptedBy: string | null;
}

interface AcceptInvitationFormProps {
  invitation: Invitation;
}

export function AcceptInvitationForm({ invitation }: AcceptInvitationFormProps) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);

  const handleAcceptInvitation = async () => {
    setAccepting(true);
    try {
      await acceptInvitation(invitation.token);
      toast.success("Invitation accepted! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <UserPlus className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <CardTitle>You&apos;re Invited!</CardTitle>
        <CardDescription>
          You&apos;ve been invited to join EMSA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center space-y-2">
          <p className="font-medium">Hello {invitation.name}</p>
          <p className="text-sm text-muted-foreground">
            You&apos;ve been invited to join as a <strong>{invitation.role}</strong>
          </p>
          {invitation.message && (
            <p className="text-sm italic">&quot;{invitation.message}&quot;</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Button 
            onClick={handleAcceptInvitation}
            disabled={accepting}
            className="w-full gap-2"
          >
            {accepting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Accept Invitation
              </>
            )}
          </Button>
          <Button 
            onClick={() => router.push("/")} 
            variant="outline" 
            className="w-full"
          >
            Decline
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          This invitation expires on {new Date(invitation.expiresAt).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
