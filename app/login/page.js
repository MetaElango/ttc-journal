import { Suspense } from "react";
import LoginClient from "./login-client";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="px-6 py-16">Loading...</div>}>
      <LoginClient />
    </Suspense>
  );
}
