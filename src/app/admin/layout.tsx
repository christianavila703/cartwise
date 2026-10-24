import { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminShell } from "@/domains/admin/components/shell";
import { getSession, isAdmin } from "@/shared/lib/auth";

export const metadata: Metadata = {
  title: {
    default: "Dashboard — Cartwise Admin",
    template: "%s — Cartwise Admin",
  },
};

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getSession();
  if (!session) {
    redirect("/login?callbackUrl=/admin");
  }
  if (!(await isAdmin())) {
    redirect("/");
  }

  return <AdminShell user={{ name: session.user.name ?? "", email: session.user.email ?? "" }}>{children}</AdminShell>;
};

export default AdminLayout;
