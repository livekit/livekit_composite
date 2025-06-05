"use client";
import { useCredentials } from "@/hooks/use-credentials";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { credentials } = useCredentials();
  const router = useRouter();

  useEffect(() => {
    if (
      !credentials.LIVEKIT_URL ||
      !credentials.LIVEKIT_API_KEY ||
      !credentials.LIVEKIT_API_SECRET
    ) {
      router.push("/");
    }
  }, [credentials, router]);

  return <Suspense>{children}</Suspense>;
}
