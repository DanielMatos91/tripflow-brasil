import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Shield, UserCog, Plus, Trash2 } from "lucide-react";
import { AppRole } from "@/types/database";

interface UserWithRoles {
  id: string;
  name: string;
  email: string;
  roles: { id: string; role: AppRole; status: string }[];
}

const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: "Administrador",
  STAFF: "Equipe",
  DRIVER: "Motorista",
  FLEET: "Frota",
  CUSTOMER: "Cliente",
};

const ROLE_COLORS: Record<AppRole, string> = {
  ADMIN: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  STAFF: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  DRIVER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  FLEET: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CUSTOMER: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function Users() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [newRole, setNewRole] = useState<AppRole | "">("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("id, user_id, role, status");

      if (rolesError) throw rolesError;

      // Map roles to users
      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile) => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        roles: (roles || [])
          .filter((r) => r.user_id === profile.id)
          .map((r) => ({ id: r.id, role: r.role as AppRole, status: r.status })),
      }));

      return usersWithRoles;
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role, status: "active" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role adicionada com sucesso!");
      setIsAddRoleOpen(false);
      setNewRole("");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("Este usuário já possui esta role.");
      } else {
        toast.error("Erro ao adicionar role.");
      }
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role removida com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao remover role.");
    },
  });

  const availableRolesToAdd = selectedUser
    ? (["ADMIN", "STAFF", "DRIVER", "FLEET", "CUSTOMER"] as AppRole[]).filter(
        (r) => !selectedUser.roles.some((ur) => ur.role === r)
      )
    : [];

  return (
    <AdminLayout
      title="Gerenciar Usuários"
      subtitle="Administre permissões e roles dos usuários"
    >
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 ? (
                        <span className="text-muted-foreground text-sm">
                          Sem roles
                        </span>
                      ) : (
                        user.roles.map((r) => (
                          <Badge
                            key={r.id}
                            variant="secondary"
                            className={ROLE_COLORS[r.role]}
                          >
                            {ROLE_LABELS[r.role]}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUser(user)}
                    >
                      <UserCog className="h-4 w-4 mr-1" />
                      Gerenciar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Manage User Roles Dialog */}
      <Dialog open={!!selectedUser && !isAddRoleOpen} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Gerenciar Roles
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.name} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Roles atuais</Label>
              {selectedUser?.roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma role atribuída
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedUser?.roles.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted"
                    >
                      <Badge variant="secondary" className={ROLE_COLORS[r.role]}>
                        {ROLE_LABELS[r.role]}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRoleMutation.mutate(r.id)}
                        disabled={removeRoleMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedUser(null)}
            >
              Fechar
            </Button>
            <Button
              onClick={() => setIsAddRoleOpen(true)}
              disabled={availableRolesToAdd.length === 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Role Dialog */}
      <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Role</DialogTitle>
            <DialogDescription>
              Selecione a role para {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label>Role</Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione uma role" />
              </SelectTrigger>
              <SelectContent>
                {availableRolesToAdd.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRoleOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                selectedUser &&
                newRole &&
                addRoleMutation.mutate({ userId: selectedUser.id, role: newRole as AppRole })
              }
              disabled={!newRole || addRoleMutation.isPending}
            >
              {addRoleMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
