import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cartwise - Products List",
};

const ListLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ListLayout;
