import { Metadata } from "next";

import { UsersView } from "@/domains/admin/components/user/usersView";

export const metadata: Metadata = { title: "Users" };

const AdminUsers = () => <UsersView />;

export default AdminUsers;
