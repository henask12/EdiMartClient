"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Pagination } from "@/components/Pagination";
import { PermissionMatrix, type RoleRow } from "@/components/PermissionMatrix";
import { ActionGroup } from "@/components/ui/ActionGroup";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Trash2 } from "@/lib/icons";
import { isOwnerRole } from "@/lib/permissions";

type UserInRole = {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  role: { name: string };
};

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [users, setUsers] = useState<UserInRole[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(15);
  const [usersTotal, setUsersTotal] = useState(0);
  const [rolesPage, setRolesPage] = useState(1);
  const [rolesPageSize] = useState(10);
  const [deleteRole, setDeleteRole] = useState<RoleRow | null>(null);

  const loadRoles = useCallback(async () => {
    const res = await fetch("/api/proxy/roles", { cache: "no-store" });
    if (res.status === 403) {
      setForbidden(true);
      return;
    }
    if (res.ok) {
      const data = (await res.json()) as RoleRow[];
      setRoles(data);
      setForbidden(false);
      if (!selectedId && data[0]) setSelectedId(data[0].id);
    }
  }, [selectedId]);

  const loadUsers = useCallback(async () => {
    if (!selectedId) return;
    const params = new URLSearchParams({
      skip: String((usersPage - 1) * usersPageSize),
      take: String(usersPageSize),
    });
    const res = await fetch(`/api/proxy/roles/${selectedId}/users?${params}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { items: UserInRole[]; total: number };
      setUsers(data.items);
      setUsersTotal(data.total);
    }
  }, [selectedId, usersPage, usersPageSize]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const selectedRole = roles.find((r) => r.id === selectedId);
  const rolesTotal = roles.length;
  const pagedRoles = roles.slice(
    (rolesPage - 1) * rolesPageSize,
    rolesPage * rolesPageSize,
  );

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/proxy/roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newRoleName }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Could not create role");
      return;
    }
    setNewRoleName("");
    await loadRoles();
    if (data.id) setSelectedId(data.id as string);
  };

  const handleDelete = async (role: RoleRow) => {
    if (role.isProtected || isOwnerRole(role.name)) {
      setError("This role cannot be deleted");
      return;
    }
    const res = await fetch(`/api/proxy/roles/${role.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Could not delete role");
      return;
    }
    setSelectedId(null);
    await loadRoles();
  };

  const roleColumns: DataTableColumn<RoleRow>[] = [
    {
      key: "name",
      header: "Role",
      render: (r) => (
        <button
          type="button"
          onClick={() => setSelectedId(r.id)}
          className={`text-left font-medium ${selectedId === r.id ? "text-accent" : "text-text"}`}
        >
          {r.name}
          {r.isProtected ? (
            <span className="ml-2 text-[10px] font-normal text-text-muted">protected</span>
          ) : null}
        </button>
      ),
    },
    {
      key: "users",
      header: "Users",
      className: "tabular-nums",
      render: (r) => r.userCount ?? 0,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) =>
        !r.isProtected && !isOwnerRole(r.name) ? (
          <ActionGroup>
            <IconButton
              variant="danger"
              aria-label="Delete role"
              title="Delete"
              icon={<Trash2 />}
              onClick={() => setDeleteRole(r)}
            />
          </ActionGroup>
        ) : null,
    },
  ];

  const userColumns: DataTableColumn<UserInRole>[] = [
    {
      key: "email",
      header: "User",
      render: (u) => (
        <div>
          <p className="font-medium text-text">{u.displayName ?? u.email}</p>
          <p className="text-xs text-text-muted">{u.email}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <Badge variant={u.isActive ? "success" : "neutral"}>
          {u.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  if (forbidden) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-text">Roles</h1>
        <p className="text-sm text-text-muted">
          You need the <strong className="text-text">Manage roles</strong> permission.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Roles"
        description="Create custom roles, assign permissions, and see who has each role."
      />

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="rounded-xl border border-border bg-surface p-5 shadow-sm flex flex-wrap gap-3 sm:items-end"
      >
        <Input
          required
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
          placeholder="New role name (e.g. Shift lead)"
          label="New role"
          containerClassName="min-w-[12rem] flex-1"
        />
        <Button type="submit" size="sm">
          Add role
        </Button>
      </form>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <PermissionMatrix roles={roles} onSaved={loadRoles} focusRoleId={selectedId} />

      <DataTable columns={roleColumns} rows={pagedRoles} rowKey={(r) => r.id} />

      {rolesTotal > rolesPageSize ? (
        <Pagination
          page={rolesPage}
          pageSize={rolesPageSize}
          total={rolesTotal}
          onPageChange={setRolesPage}
        />
      ) : null}

      {selectedRole ? (
        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-text">People with the {selectedRole.name} role</h2>
          <p className="mt-1 text-xs text-text-muted">Choose another role in the table above to see who has it.</p>
          <div className="mt-4">
            <DataTable
              columns={userColumns}
              rows={users}
              rowKey={(u) => u.id}
              emptyMessage="No users in this role."
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <PageSizeSelect
                value={usersPageSize}
                options={[10, 15, 25]}
                onChange={(size) => {
                  setUsersPageSize(size);
                  setUsersPage(1);
                }}
              />
              <Pagination
                page={usersPage}
                pageSize={usersPageSize}
                total={usersTotal}
                onPageChange={setUsersPage}
              />
            </div>
          </div>
        </section>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteRole)}
        title="Delete role"
        message={
          deleteRole
            ? `Delete role "${deleteRole.name}"? Users with this role must be reassigned first.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={async () => {
          if (deleteRole) {
            await handleDelete(deleteRole);
            setDeleteRole(null);
          }
        }}
        onCancel={() => setDeleteRole(null)}
      />
    </div>
  );
};
