"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

/** Shown instead of a page the signed-in person is not allowed to use. Never a blank page. */
export const AccessDenied = ({ needs }: { needs?: string[] }) => (
  <div className="mx-auto max-w-lg space-y-6 py-10 text-center" role="alert">
    <PageHeader
      title="You don't have access to this"
      description="Your role is not allowed to use this page. If you need it, ask the shop owner to change your role."
    />
    {needs && needs.length > 0 ? (
      <p className="text-sm text-white/55">
        It needs: <span className="text-white/80">{needs.join(", ")}</span>
      </p>
    ) : null}
    <Link href="/dashboard">
      <Button type="button" variant="secondary">
        Back to home
      </Button>
    </Link>
  </div>
);
