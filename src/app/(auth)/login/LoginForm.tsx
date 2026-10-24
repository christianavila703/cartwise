"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

import { AuthFormCard } from "@/app/(auth)/_components/AuthFormCard";
import Button from "@/shared/components/UI/button";
import { Input } from "@/shared/components/UI/input";

// only allow redirects to paths on this site, so the login page can't be used to send users elsewhere
const getSafeCallbackUrl = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const callback = await signIn("credentials", {
        ...loginData,
        redirect: false,
      });
      if (callback?.ok) {
        router.push(callbackUrl);
        router.refresh();
        return;
      }
      if (callback?.error) {
        setError("Email or password is incorrect.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormCard title="Sign in" subtitle="Welcome back to Cartwise.">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700" htmlFor="signin-email">
            Email
          </label>
          <Input
            id="signin-email"
            type="email"
            name="email"
            autoComplete="email"
            inputSize="base"
            value={loginData.email}
            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700" htmlFor="signin-password">
            Password
          </label>
          <Input
            id="signin-password"
            type="password"
            name="password"
            autoComplete="current-password"
            inputSize="base"
            value={loginData.password}
            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
            required
          />
        </div>
        {error ? <p className="text-sm text-cartwise-red-500">{error}</p> : null}
        <Button type="submit" className="w-full border-cartwise-blue-500 bg-cartwise-blue-500 text-white hover:bg-cartwise-blue-400" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-cartwise-blue-500 hover:text-cartwise-blue-400">
          Sign up
        </Link>
      </p>
    </AuthFormCard>
  );
}
