import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FileText, Mail, CreditCard, AlertTriangle } from "lucide-react"
import { isApiConfigured } from "@/utils/api-config"

export default function Home() {
  const apiConfigured = isApiConfigured()

  return (
    <div className="container py-10">
      <div className="flex flex-col items-center text-center mb-10 space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Simplify Your Tax Filing</h1>
        <p className="text-xl text-muted-foreground max-w-[700px]">
          TwentyTax uses AI to help you understand tax requirements, find tax documents, and classify expenses.
        </p>
      </div>

      {!apiConfigured && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>API Key Not Configured</AlertTitle>
          <AlertDescription>
            OpenAI API key is not configured. Please add your API key to the .env.local file to use all features. See
            the README.md file for setup instructions.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Feature - What YOU Have to Do for Taxes */}
      <div className="mb-10">
        <Card className="border-2 border-primary shadow-lg">
          <CardHeader className="space-y-1 bg-primary/5 pb-6">
            <CardTitle className="text-3xl flex items-center justify-center">
              <FileText className="mr-3 h-8 w-8 text-primary" />
              What YOU Have to Do for Taxes
            </CardTitle>
            <CardDescription className="text-center text-base">
              Find out exactly what tax forms you need to file based on your personal situation
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-center mb-4">
              Answer a few simple questions about your age, income, and state to get personalized tax filing guidance
              with direct citations from IRS documentation.
            </p>
            <div className="flex justify-center">
              <Button asChild size="lg" className="px-8 py-6 text-lg">
                <Link href="/irs-requirements">Check Your Tax Requirements</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Features */}
      <h2 className="text-2xl font-semibold mb-6 text-center">Additional Tax Tools</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl flex items-center">
              <Mail className="mr-2 h-5 w-5" />
              Email Scanner
            </CardTitle>
            <CardDescription>Find tax documents in your email</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Scan your email for important tax documents like 1099s and W2s, and get them organized in one place for
              easy access.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/email-scanner">Scan Emails</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Expense Classifier
            </CardTitle>
            <CardDescription>Categorize expenses for tax filing</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Upload your bank statements and automatically classify expenses into tax categories, identifying which
              ones are deductible.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/expense-classifier">Classify Expenses</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
