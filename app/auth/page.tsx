import { AuthForm } from "@/components/auth/auth-form"

export const metadata = {
  title: "Authentication - TwentyTax",
  description: "Sign in or create an account to use TwentyTax",
}

export default function AuthPage() {
  return (
    <div className="container py-10">
      <div className="flex flex-col items-center text-center mb-10 space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Account Access</h1>
        <p className="text-muted-foreground max-w-[700px]">
          Sign in to your account or create a new one to access all features of TwentyTax
        </p>
      </div>

      <div className="mx-auto max-w-md">
        <AuthForm />
      </div>
    </div>
  )
}
