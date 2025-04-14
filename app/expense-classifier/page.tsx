import { ExpenseClassifierForm } from "./expense-classifier-form"

export const metadata = {
  title: "Expense Classifier - TaxHelper",
  description: "Classify your expenses for tax filing",
}

export default function ExpenseClassifierPage() {
  return (
    <div className="container py-10">
      <div className="flex flex-col items-center text-center mb-10 space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Expense Classifier</h1>
        <p className="text-muted-foreground max-w-[700px]">
          Upload your bank statements and we'll help you classify expenses for tax filing, identifying which ones are
          deductible.
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <ExpenseClassifierForm />
      </div>
    </div>
  )
}
