"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { assignGptSchema, AssignGptValues } from "@/lib/zodSchema";
import { TeamMember } from "@/data/get-team-members";
import { AdminGpt } from "@/data/get-admin-gpts";
import { UserAssignedGpt } from "@/data/get-user-assigned-gpts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, SparkleIcon, User, Mail } from "lucide-react";
import { toast } from "sonner";
import { assignGptsToUser } from "../action";
import { getAdminGpts } from "@/data/get-admin-gpts";
import { getUserAssignedGpts } from "@/data/get-user-assigned-gpts";

interface AssignGptDialogProps {
  user: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AssignGptDialog({ user, open, onOpenChange }: AssignGptDialogProps) {
  const [adminGpts, setAdminGpts] = useState<AdminGpt[]>([]);
  const [assignedGpts, setAssignedGpts] = useState<UserAssignedGpt[]>([]);
  const [selectedGptIds, setSelectedGptIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const {
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AssignGptValues>({
    resolver: zodResolver(assignGptSchema),
    defaultValues: {
      userId: "",
      gptIds: [],
    },
  });

  // Load data when dialog opens
  useEffect(() => {
    if (open && user) {
      loadData();
    }
  }, [open, user]);

  // Update selected GPTs when assigned GPTs change
  useEffect(() => {
    if (assignedGpts.length > 0) {
      const assignedIds = assignedGpts.map(ag => ag.gpt.id);
      setSelectedGptIds(assignedIds);
    } else {
      setSelectedGptIds([]);
    }
  }, [assignedGpts]);

  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [adminGptsData, assignedGptsData] = await Promise.all([
        getAdminGpts(),
        getUserAssignedGpts(user.id)
      ]);
      
      setAdminGpts(adminGptsData);
      setAssignedGpts(assignedGptsData);
    } catch (error) {
      toast.error("Failed to load GPT data");
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGptToggle = (gptId: string) => {
    setSelectedGptIds(prev => 
      prev.includes(gptId) 
        ? prev.filter(id => id !== gptId)
        : [...prev, gptId]
    );
  };

  const onSubmit = async () => {
    if (!user) return;

    startTransition(async () => {
      try {
        const result = await assignGptsToUser({
          userId: user.id,
          gptIds: selectedGptIds
        });
        
        if (result.success) {
          toast.success("GPTs assigned successfully");
          onOpenChange(false);
          reset();
          router.refresh();
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to assign GPTs");
      }
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getModelBadgeVariant = (model: string) => {
    if (model.includes("gpt")) return "default";
    if (model.includes("claude")) return "secondary";
    if (model.includes("gemini")) return "outline";
    return "outline";
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparkleIcon className="h-5 w-5 text-primary" />
            Assign GPTs to User
          </DialogTitle>
          <DialogDescription>
            Select which GPTs to assign to {user.name}
          </DialogDescription>
        </DialogHeader>

        {/* User Info */}
        <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={user.image || undefined}
              alt={user.name}
            />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="font-medium leading-none">{user.name}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {user.email}
            </p>
          </div>
        </div>

        {/* GPT Selection */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Available GPTs</h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading GPTs...</span>
            </div>
          ) : adminGpts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <SparkleIcon className="h-8 w-8 mx-auto mb-2" />
              <p>No admin GPTs available for assignment</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {adminGpts.map((gpt) => (
                <div
                  key={gpt.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={gpt.id}
                    checked={selectedGptIds.includes(gpt.id)}
                    onCheckedChange={() => handleGptToggle(gpt.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={gpt.image} alt={gpt.name} />
                        <AvatarFallback className="text-xs">
                          {gpt.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <label
                          htmlFor={gpt.id}
                          className="font-medium text-sm cursor-pointer"
                        >
                          {gpt.name}
                        </label>
                        <Badge 
                          variant={getModelBadgeVariant(gpt.model)} 
                          className="ml-2 text-xs"
                        >
                          {gpt.model}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {gpt.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created by {gpt.user.name} • {new Date(gpt.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isPending || loading}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <SparkleIcon className="h-4 w-4 mr-2" />
                Assign GPTs ({selectedGptIds.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
