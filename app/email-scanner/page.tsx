import { EmailScannerForm } from "./email-scanner-form"

export const metadata = {
  title: "Email Scanner - TwentyTax",
  description: "Scan your emails for tax documents like 1099s and W2s",
}

export default function EmailScannerPage() {
  return (
    <div className="container py-10">
      <div className="flex flex-col items-center text-center mb-10 space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Email Scanner</h1>
        <p className="text-muted-foreground max-w-[700px]">
          Connect your email account to scan for tax documents like 1099s and W2s. We'll help you find and organize
          them.
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <EmailScannerForm />
      </div>
    </div>
  )
}
