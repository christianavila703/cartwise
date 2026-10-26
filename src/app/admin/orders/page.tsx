import { Metadata } from "next";
import { Suspense } from "react";

import { OrdersView } from "@/domains/admin/components/order/ordersView";

export const metadata: Metadata = { title: "Orders" };

const AdminOrders = () => (
  <Suspense>
    <OrdersView />
  </Suspense>
);

export default AdminOrders;
