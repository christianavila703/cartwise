import { Metadata } from "next";
import { Suspense } from "react";

import { TrafficView } from "@/domains/admin/components/traffic/trafficView";

export const metadata: Metadata = { title: "Traffic" };

const AdminTraffic = () => (
  <Suspense>
    <TrafficView />
  </Suspense>
);

export default AdminTraffic;
