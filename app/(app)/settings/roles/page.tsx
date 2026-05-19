"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Pagination } from "@/components/Pagination";
import { RolePermissionsEditor, type RoleRow } from "@/components/RolePermissionsEditor";
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
  const [tab, setTab] = useState<"permissions" | "users">("permissions");
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
    if (tab === "users") void loadUsers();
  }, [tab, loadUsers]);

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
          className={`text-left font-medium ${selectedId === r.id ? "text-[var(--accent)]" : "text-white"}`}
        >
          {r.name}
          {r.isProtected ? (
            <span className="ml-2 text-[10px] font-normal text-white/40">protected</span>
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
          <button
            type="button"
            onClick={() => setDeleteRole(r)}
            className="text-xs font-semibold text-rose-300"
          >
            Delete
          </button>
        ) : null,
    },
  ];

  const userColumns: DataTableColumn<UserInRole>[] = [
    {
      key: "email",
      header: "User",
      render: (u) => (
        <div>
          <p className="font-medium text-white">{u.displayName ?? u.email}</p>
          <p className="text-xs text-white/45">{u.email}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            u.isActive ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-white/40"
          }`}
        >
          {u.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  if (forbidden) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-white">Roles</h1>
        <p className="text-sm text-white/60">
          You need the <strong className="text-white">Manage roles</strong> permission.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Roles</h1>
        <p className="mt-2 text-sm text-white/60">
          Create custom roles, assign permissions, and see who has each role.
        </p>
      </div>

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-[color:var(--surface)]/60 p-4"
      >
        <input
          required
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
          placeholder="New role name (e.g. Shift lead)"
          className="min-w-[12rem] flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
        />
        <button type="submit" className="tap btn-primary px-4 py-2 text-sm">
          Add role
        </button>
      </form>

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}

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
        <section className="rounded-2xl border border-white/10 bg-[color:var(--surface)]/60 p-5">
          <h2 className="text-lg font-semibold text-white">{selectedRole.name}</h2>
          <div className="mt-4 flex gap-2 border-b border-white/10">
            {(["permissions", "users"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`tap border-b-2 px-3 py-2 text-sm font-semibold capitalize ${
                  tab === t
                    ? "border-[var(--brand-yellow)] text-[var(--accent)]"
                    : "border-transparent text-white/50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {tab === "permissions" ? (
              <RolePermissionsEditor roleId={selectedId} compact />
            ) : (
              <>
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
              </>
            )}
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
