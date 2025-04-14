"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, Upload, FileSpreadsheet, FileText, Check, X } from "lucide-react"
import { classifyExpenses } from "./actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface ClassifiedExpense {
  id: string
  date: string
  description: string
  amount: number
  category: string
  deductible: boolean
  confidence: number
}

export function ExpenseClassifierForm() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [expenses, setExpenses] = useState<ClassifiedExpense[]>([])
  const [summary, setSummary] = useState<{
    totalExpenses: number
    totalDeductible: number
    categoryCounts: Record<string, number>
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]

      // Check if file is CSV, Excel, or PDF
      const validTypes = [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/pdf",
      ]

      // Also check file extension for cases where MIME type might not be correctly set
      const validExtensions = [".csv", ".xls", ".xlsx", ".pdf"]
      const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase()

      if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(fileExtension)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV, Excel, or PDF file",
          variant: "destructive",
        })
        return
      }

      setFile(selectedFile)
    }
  }

  const handleSubmit = async () => {
    if (!file) {
      toast({
        title: "Please select a file",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const results = await classifyExpenses(formData)
      setExpenses(results.expenses)
      setSummary(results.summary)

      toast({
        title: "Expenses classified",
        description: `Classified ${results.expenses.length} expenses`,
      })
    } catch (error) {
      toast({
        title: "Error classifying expenses",
        description: "Please try again later",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setExpenses([])
    setSummary(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Bank Statement</CardTitle>
          <CardDescription>Upload your bank statement to classify expenses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="bank-statement">Bank Statement</Label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="bank-statement"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">CSV, Excel, or PDF files</p>
                </div>
                <input
                  id="bank-statement"
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".csv,.xls,.xlsx,.pdf"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            {file && (
              <div className="flex items-center gap-2 text-sm">
                {file.type === "application/pdf" || file.name.endsWith(".pdf") ? (
                  <FileText className="h-4 w-4" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                <span>{file.name}</span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button onClick={handleSubmit} disabled={loading || !file} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Classifying...
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Classify Expenses
              </>
            )}
          </Button>
          {file && (
            <Button variant="outline" onClick={resetForm} disabled={loading} className="w-full">
              Reset
            </Button>
          )}
        </CardFooter>
      </Card>

      {expenses.length > 0 && summary && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Expense Summary</CardTitle>
              <CardDescription>Overview of your classified expenses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold">${Math.abs(summary.totalExpenses).toFixed(2)}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Deductible Expenses</p>
                  <p className="text-2xl font-bold">${summary.totalDeductible.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Expense Categories</h3>
                <div className="space-y-2">
                  {Object.entries(summary.categoryCounts).map(([category, count]) => (
                    <div key={category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{category}</span>
                        <span>{count} expenses</span>
                      </div>
                      <Progress value={(count / expenses.length) * 100} />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Classified Expenses</CardTitle>
              <CardDescription>We've classified {expenses.length} expenses from your bank statement</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Deductible</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>${Math.abs(expense.amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{expense.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {expense.deductible ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
