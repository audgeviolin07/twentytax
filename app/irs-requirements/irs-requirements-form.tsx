"use client"

import type React from "react"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, FileText, ExternalLink, CheckCircle, AlertCircle } from "lucide-react"
import { checkIrsRequirements } from "./actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
]

const FILING_STATUSES = [
  { value: "single", label: "Single" },
  { value: "married_joint", label: "Married Filing Jointly" },
  { value: "married_separate", label: "Married Filing Separately" },
  { value: "head_household", label: "Head of Household" },
  { value: "qualifying_widow", label: "Qualifying Widow(er)" },
]

export function IrsRequirementsForm() {
  const [state, setState] = useState("")
  const [age, setAge] = useState("")
  const [income, setIncome] = useState("")
  const [filingStatus, setFilingStatus] = useState("single")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!state) {
      toast({
        title: "Please select a state",
        variant: "destructive",
      })
      return
    }

    if (!age || isNaN(Number(age)) || Number(age) <= 0) {
      toast({
        title: "Please enter a valid age",
        variant: "destructive",
      })
      return
    }

    if (!income || isNaN(Number(income.replace(/,/g, "")))) {
      toast({
        title: "Please enter a valid income amount",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const data = await checkIrsRequirements(state, Number(age), Number(income.replace(/,/g, "")), filingStatus)
      setResults(data)
    } catch (error: any) {
      toast({
        title: "Error checking requirements",
        description: error.message || "Please try again later",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Format income as currency
  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove non-numeric characters
    const value = e.target.value.replace(/[^0-9.]/g, "")

    // Format with commas
    if (value) {
      const number = Number.parseFloat(value)
      if (!isNaN(number)) {
        setIncome(number.toLocaleString("en-US"))
      } else {
        setIncome(value)
      }
    } else {
      setIncome("")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Personal Information</CardTitle>
          <CardDescription>We'll check if you need to file taxes based on your situation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Your Age</Label>
              <Input
                id="age"
                type="number"
                placeholder="Enter your age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="income">Your Annual Income</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                <Input
                  id="income"
                  placeholder="Enter your income"
                  value={income}
                  onChange={handleIncomeChange}
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filing-status">Filing Status</Label>
              <Select value={filingStatus} onValueChange={setFilingStatus}>
                <SelectTrigger id="filing-status">
                  <SelectValue placeholder="Select filing status" />
                </SelectTrigger>
                <SelectContent>
                  {FILING_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Your State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger id="state">
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Check My Tax Requirements
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Your Tax Filing Requirements</CardTitle>
            <CardDescription>
              Based on your age ({age}), income (${income}), and state (
              {US_STATES.find((s) => s.value === state)?.label})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filing Requirement Status */}
            <Alert
              variant={results.mustFile ? "destructive" : "default"}
              className={results.mustFile ? "bg-destructive/10" : "bg-green-50 dark:bg-green-950/20"}
            >
              {results.mustFile ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              <AlertTitle className={results.mustFile ? "text-destructive" : "text-green-600"}>
                {results.mustFile ? "You Need to File Taxes" : "You May Not Need to File Taxes"}
              </AlertTitle>
              <AlertDescription className="mt-1">{results.filingRequirementReason}</AlertDescription>
            </Alert>

            {/* Federal Forms */}
            <div>
              <h3 className="font-semibold text-lg">
                Federal Forms {results.mustFile ? "You Need to File" : "If You Choose to File"}
              </h3>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {results.requiredFederalForms?.map((form: string, index: number) => (
                  <li key={index}>{form}</li>
                ))}
              </ul>
            </div>

            {/* State Forms */}
            <div>
              <h3 className="font-semibold text-lg">State Forms</h3>
              {results.requiredStateForms?.length > 0 ? (
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {results.requiredStateForms.map((form: string, index: number) => (
                    <li key={index}>{form}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-muted-foreground">No state forms required</p>
              )}
            </div>

            {/* Tax Rates */}
            <div>
              <h3 className="font-semibold text-lg">Tax Rates That Apply to You</h3>
              <p className="mt-2">{results.taxRates}</p>
            </div>

            {/* Deadlines */}
            {results.deadlines && (
              <div>
                <h3 className="font-semibold text-lg">Important Deadlines</h3>
                <p className="mt-2">{results.deadlines}</p>
              </div>
            )}

            {/* Source */}
            <div className="bg-muted p-4 rounded-md">
              <h3 className="font-semibold text-lg mb-2">Source Information</h3>
              <p className="text-sm italic">{results.sourceExcerpt}</p>
              {results.sourceUrl && (
                <a
                  href={results.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline flex items-center mt-2"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Source: {results.sourceUrl}
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
