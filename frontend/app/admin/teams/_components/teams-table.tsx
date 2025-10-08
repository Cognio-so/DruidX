"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { teamMemberUpdateSchema, TeamMemberUpdateValues } from "@/lib/zodSchema";
import { TeamMember } from "@/data/get-team-members";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  User,
  Mail,
  Calendar,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { updateUser, deleteUser } from "../action";

interface TeamsTableProps {
  teamMembers: TeamMember[];
  searchTerm: string;
  roleFilter: string;
  statusFilter: string;
}

export default function TeamsTable({ 
  teamMembers, 
  searchTerm, 
  roleFilter, 
  statusFilter 
}: TeamsTableProps) {
  const [editingUser, setEditingUser] = useState<TeamMember | null>(null);
  const [deletingUser, setDeletingUser] = useState<TeamMember | null>(null);
  const [isPending, startTransition] = useTransition();
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>(teamMembers);
  const router = useRouter();

  // Filter logic
  useEffect(() => {
    let filtered = teamMembers;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(member => member.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "verified") {
        filtered = filtered.filter(member => member.emailVerified);
      } else if (statusFilter === "pending") {
        filtered = filtered.filter(member => !member.emailVerified);
      }
    }

    setFilteredMembers(filtered);
  }, [teamMembers, searchTerm, roleFilter, statusFilter]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<TeamMemberUpdateValues>({
    resolver: zodResolver(teamMemberUpdateSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "user",
    },
  });

  const handleEdit = (user: TeamMember) => {
    setEditingUser(user);
    // Reset form with user data
    reset({
      name: user.name,
      email: user.email,
      role: (user.role as "admin" | "user") || "user",
    });
  };

  const handleDelete = (user: TeamMember) => {
    setDeletingUser(user);
  };

  const onSubmit = async (data: TeamMemberUpdateValues) => {
    if (!editingUser) return;

    startTransition(async () => {
      try {
        const result = await updateUser(editingUser.id, data);
        if (result.success) {
          toast.success("User updated successfully");
          setEditingUser(null);
          reset();
          router.refresh();
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update user");
      }
    });
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    startTransition(async () => {
      try {
        const result = await deleteUser(deletingUser.id);
        if (result.success) {
          toast.success("User deleted successfully");
          setDeletingUser(null);
          router.refresh();
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete user");
      }
    });
  };

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case "admin":
        return "default";
      case "user":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <User className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {teamMembers.length === 0 
                        ? "No team members found" 
                        : "No members match your search criteria"
                      }
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={member.image || undefined}
                          alt={member.name}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <p className="font-medium leading-none">{member.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {member.role === "admin" ? (
                        <Shield className="h-3 w-3 mr-1" />
                      ) : (
                        <User className="h-3 w-3 mr-1" />
                      )}
                      {member.role || "No role"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.emailVerified ? "default" : "secondary"}>
                      {member.emailVerified ? "Verified" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(member.createdAt).toLocaleDateString('en-US')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(member)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(member)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit User Dialog - same as before */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update the team member&apos;s information. Click save&apos; when you are done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  {...register("name")}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={watch("role")}
                  onValueChange={(value) => setValue("role", value as "admin" | "user")}
                >
                  <SelectTrigger className={errors.role ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-destructive">{errors.role.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingUser(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog - same as before */}
      <Dialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deletingUser?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingUser(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
