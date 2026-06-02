"use client";

import { FormEvent, useEffect, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Pagination } from "@/components/Pagination";
import { ActionGroup } from "@/components/ui/ActionGroup";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { isOwnerRole } from "@/lib/permissions";
import { KeyRound, UserCheck, UserX } from "@/lib/icons";
import { parseApiMessage, toastError, toastSuccess } from "@/lib/toast";

type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  role: { name: string };
};

type RoleOption = { id: string; name: string; isProtected: boolean };

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [forbidden, setForbidden] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("CASHIER");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const assignableRoles = roles.filter((r) => !r.isProtected && !isOwnerRole(r.name));

  const load = async () => {
    const params = new URLSearchParams({
      skip: String((page - 1) * pageSize),
      take: String(pageSize),
    });
    const res = await fetch(`/api/proxy/users?${params}`, { cache: "no-store" });
    if (res.status === 403) {
      setForbidden(true);
      return;
    }
    if (res.ok) {
      const data = (await res.json()) as { items: UserRow[]; total: number };
      setUsers(data.items);
      setTotal(data.total);
      setForbidden(false);
    }
  };

  useEffect(() => {
    void fetch("/api/proxy/roles", { cache: "no-store" }).then(async (res) => {
      if (res.ok) {
        const data = (await res.json()) as RoleOption[];
        setRoles(data);
        const first = data.find((r) => !r.isProtected && r.name !== "OWNER");
        if (first) setRole(first.name);
      }
    });
  }, []);

  useEffect(() => {
    void load();
  }, [page, pageSize]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toastError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toastError("Passwords do not match");
      return;
    }
    const res = await fetch("/api/proxy/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, displayName, role, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toastError(parseApiMessage(data, "Could not create user"));
      return;
    }
    toastSuccess("User created");
    setEmail("");
    setDisplayName("");
    setPassword("");
    setConfirmPassword("");
    setAddOpen(false);
    await load();
  };

  const handleToggle = async (id: string, isActive: boolean, userRole: string) => {
    if (isOwnerRole(userRole) && isActive) {
      toastError("Owner accounts cannot be deactivated");
      return;
    }
    await fetch(`/api/proxy/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    await load();
  };

  const handleRole = async (id: string, newRole: string, currentRole: string) => {
    if (isOwnerRole(currentRole)) {
      toastError("Owner role cannot be changed");
      return;
    }
    const res = await fetch(`/api/proxy/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toastError(parseApiMessage(data, "Could not update role"));
      return;
    }
    await load();
  };

  const handleReset = async () => {
    if (!resetId || !resetPassword) return;
    if (resetPassword.length < 8) {
      toastError("Password must be at least 8 characters");
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      toastError("Passwords do not match");
      return;
    }
    const res = await fetch(`/api/proxy/users/${resetId}/reset-password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: resetPassword }),
    });
    if (res.ok) {
      toastSuccess("Password reset");
      setResetId(null);
      setResetPassword("");
      setResetConfirmPassword("");
    } else {
      toastError("Reset failed");
    }
  };

  const columns: DataTableColumn<UserRow>[] = [
    {
      key: "email",
      header: "Email",
      render: (u) => (
        <div>
          <p className="font-medium text-white">{u.displayName ?? u.email}</p>
          <p className="text-xs text-white/45">{u.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (u) =>
        isOwnerRole(u.role.name) ? (
          <Badge variant="success">OWNER</Badge>
        ) : (
          <Select
            value={u.role.name}
            onChange={(e) => void handleRole(u.id, e.target.value, u.role.name)}
            aria-label={`Role for ${u.email}`}
            containerClassName="inline-block min-w-[7rem]"
          >
            {assignableRoles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </Select>
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
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (u) => (
        <ActionGroup>
          {!isOwnerRole(u.role.name) ? (
            <IconButton
              variant="secondary"
              aria-label={u.isActive ? "Deactivate user" : "Activate user"}
              title={u.isActive ? "Deactivate" : "Activate"}
              icon={u.isActive ? <UserX /> : <UserCheck />}
              onClick={() => void handleToggle(u.id, u.isActive, u.role.name)}
            />
          ) : (
            <span className="text-[10px] text-white/40">Protected</span>
          )}
          <IconButton
            variant="secondary"
            aria-label="Reset password"
            title="Reset password"
            icon={<KeyRound />}
            onClick={() => setResetId(u.id)}
          />
        </ActionGroup>
      ),
    },
  ];

  if (forbidden) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <PageHeader
          title="User management"
          description="You need the Manage users permission. Ask the shop owner to grant it to your role."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User management"
        description="Create accounts and assign roles for your team."
        actions={
          <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
            Add user
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={users}
        rowKey={(u) => u.id}
        footer={{
          label: "Page subtotal",
          cells: { email: `${users.length} on this page` },
        }}
        emptyMessage="No users yet. Add your first team member."
        mobileCard={(u) => (
          <div className="card-surface space-y-3 p-4 text-sm">
            <p className="font-medium text-white">{u.displayName ?? u.email}</p>
            <p className="text-xs text-white/50">{u.email}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={u.isActive ? "success" : "neutral"}>
                {u.isActive ? "Active" : "Inactive"}
              </Badge>
              {isOwnerRole(u.role.name) ? (
                <Badge variant="success">OWNER</Badge>
              ) : (
                <Select
                  value={u.role.name}
                  onChange={(e) => void handleRole(u.id, e.target.value, u.role.name)}
                  containerClassName="min-w-[7rem]"
                >
                  {assignableRoles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            <ActionGroup>
              {!isOwnerRole(u.role.name) ? (
                <IconButton
                  variant="secondary"
                  aria-label={u.isActive ? "Deactivate" : "Activate"}
                  icon={u.isActive ? <UserX /> : <UserCheck />}
                  onClick={() => void handleToggle(u.id, u.isActive, u.role.name)}
                />
              ) : null}
              <IconButton
                variant="secondary"
                aria-label="Reset password"
                icon={<KeyRound />}
                onClick={() => setResetId(u.id)}
              />
            </ActionGroup>
          </div>
        )}
      />

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <PageSizeSelect
          value={pageSize}
          options={[10, 15, 25, 50]}
          onChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-4 rounded-[var(--radius-lg)] border border-white/10 bg-[color:var(--surface)] p-6">
            <h2 className="text-lg font-semibold text-white">Add user</h2>
            <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
              <Input
                required
                type="email"
                label="Email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="Display name"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
                {assignableRoles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </Select>
              <Input
                required
                type="password"
                label="Temporary password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
              />
              <Input
                required
                type="password"
                label="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
              />
              <div className="flex gap-3 pt-2">
                <Button type="submit" fullWidth>
                  Create
                </Button>
                <Button type="button" variant="secondary" fullWidth onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {resetId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-sm space-y-4 rounded-[var(--radius-lg)] border border-white/10 bg-[color:var(--surface)] p-6">
            <h3 className="font-semibold text-white">Reset password</h3>
            <Input
              type="password"
              label="New password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
            />
            <Input
              type="password"
              label="Confirm new password"
              value={resetConfirmPassword}
              onChange={(e) => setResetConfirmPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
            />
            <div className="flex gap-3">
              <Button type="button" fullWidth onClick={() => void handleReset()}>
                Save
              </Button>
              <Button type="button" variant="secondary" fullWidth onClick={() => setResetId(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
