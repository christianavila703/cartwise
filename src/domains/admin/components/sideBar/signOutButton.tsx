"use client";

import { signOut } from "next-auth/react";

const SignOutButton = ({ className }: { className?: string }) => {
  return (
    <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className={className}>
      Sign Out
    </button>
  );
};

export default SignOutButton;
