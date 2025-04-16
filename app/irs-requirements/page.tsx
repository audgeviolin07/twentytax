import { IrsRequirementsForm } from "./irs-requirements-form"

export const metadata = {
  title: "What YOU Have to Do for Taxes - TwentyTax",
  description: "Find out exactly what tax forms you need to file based on your personal situation",
}

export default function IrsRequirementsPage() {
  return (
    <div className="container py-10">
      <div className="flex flex-col items-center text-center mb-10 space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">What YOU Have to Do for Taxes</h1>
        <p className="text-muted-foreground max-w-[700px]">
          Answer a few simple questions about your personal situation to get customized guidance on what tax forms you
          need to file, whether you're required to file at all, and what tax rates apply to you.
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <IrsRequirementsForm />
      </div>
    </div>
  )
}
