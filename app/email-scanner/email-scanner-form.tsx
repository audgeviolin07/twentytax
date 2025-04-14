"use client"

import { useEffect } from "react"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Mail, FileText, ExternalLink, Download, Upload, Clipboard, LogIn, AlertCircle } from "lucide-react"
import { connectEmailProvider, scanEmails, processTaxDocuments, analyzeEmailContent } from "./actions"
import { EmailFeed } from "@/components/email-feed"

type EmailProvider = "gmail" | "outlook" | "yahoo" | "other"
type DocumentType = "W2" | "1099-MISC" | "1099-NEC" | "1099-K" | "1099-INT" | "1099-DIV" | "Other"

interface EmailDocument {
  id: string
  type: DocumentType
  sender: string
  date: string
  subject: string
  preview: string
}

interface ProcessedDocument {
  fileName: string
  fileType: string
  extractedData: {
    documentType: string
    issuer: string
    taxYear: string
    financialData: Record<string, string>
  }
}

export function EmailScannerForm() {
  const [activeTab, setActiveTab] = useState<"email" | "upload" | "paste">("email")
  const [provider, setProvider] = useState<"gmail">("gmail")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [pasteLoading, setPasteLoading] = useState(false)
  const [emailContent, setEmailContent] = useState("")
  const [documents, setDocuments] = useState<EmailDocument[]>([])
  const [processedDocuments, setProcessedDocuments] = useState<ProcessedDocument[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isEmailConnected, setIsEmailConnected] = useState(false)
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleConnectEmail = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use this feature",
        variant: "destructive",
      })
      router.push("/auth")
      return
    }

    if (!email) {
      toast({
        title: "Please enter your email",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Get OAuth URL for the selected provider
      const result = await connectEmailProvider(email, provider)

      if (result.authUrl) {
        // Store the auth URL
        setAuthUrl(result.authUrl)

        // Open the OAuth consent screen in a new window
        window.open(result.authUrl, "emailAuth", "width=600,height=700")

        toast({
          title: "Email authentication initiated",
          description: "Please complete the authentication in the popup window",
        })
      } else {
        toast({
          title: "Error connecting to email provider",
          description: result.error || "Please try again later",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error connecting email:", error)
      toast({
        title: "Error connecting email",
        description: error.message || "Please try again later",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleScanEmails = async () => {
    if (!isEmailConnected) {
      toast({
        title: "Email not connected",
        description: "Please connect your email first",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const results = await scanEmails(email, provider)
      setDocuments(results)
      toast({
        title: "Email scan completed",
        description: `Found ${results.length} tax documents`,
      })
    } catch (error: any) {
      console.error("Error scanning emails:", error)
      toast({
        title: "Error scanning emails",
        description: error.message || "Please try again later",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      setSelectedFiles(files)
    }
  }

  const handleFileUpload = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use this feature",
        variant: "destructive",
      })
      router.push("/auth")
      return
    }

    if (selectedFiles.length === 0) {
      toast({
        title: "Please select files to upload",
        variant: "destructive",
      })
      return
    }

    setUploadLoading(true)
    try {
      const formData = new FormData()
      selectedFiles.forEach((file) => {
        formData.append("files", file)
      })

      const results = await processTaxDocuments(formData)
      setProcessedDocuments(results)
      toast({
        title: "Documents processed",
        description: `Processed ${results.length} tax documents`,
      })
    } catch (error: any) {
      toast({
        title: "Error processing documents",
        description: error.message || "Please try again later",
        variant: "destructive",
      })
    } finally {
      setUploadLoading(false)
    }
  }

  const handlePasteSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use this feature",
        variant: "destructive",
      })
      router.push("/auth")
      return
    }

    if (!emailContent.trim()) {
      toast({
        title: "Please paste email content",
        variant: "destructive",
      })
      return
    }

    setPasteLoading(true)
    try {
      const results = await analyzeEmailContent(emailContent)
      setProcessedDocuments([results])
      toast({
        title: "Email content analyzed",
        description: "Successfully analyzed the pasted email content",
      })
    } catch (error: any) {
      toast({
        title: "Error analyzing email content",
        description: error.message || "Please try again later",
        variant: "destructive",
      })
    } finally {
      setPasteLoading(false)
    }
  }

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText()
      setEmailContent(clipboardText)
      toast({
        title: "Content pasted from clipboard",
      })
    } catch (error) {
      toast({
        title: "Could not access clipboard",
        description: "Please paste the content manually",
        variant: "destructive",
      })
    }
  }

  const handleDisconnect = () => {
    setIsEmailConnected(false)
    setEmail("")
    setDocuments([])
    setAuthUrl(null)
    toast({
      title: "Email disconnected",
    })
  }

  // Check for OAuth callback
  useEffect(() => {
    // Listen for message from OAuth popup window
    const handleOAuthCallback = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return

      if (event.data && event.data.type === "EMAIL_AUTH_SUCCESS") {
        setIsEmailConnected(true)
        toast({
          title: "Email connected successfully",
          description: "Your email account has been connected",
        })

        // Close the popup if it's still open
        if (event.source && "close" in event.source) {
          ;(event.source as Window).close()
        }
      }
    }

    window.addEventListener("message", handleOAuthCallback)

    return () => {
      window.removeEventListener("message", handleOAuthCallback)
    }
  }, [toast])

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>Please sign in to access the email scanner</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <LogIn className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-center mb-6">You need to be signed in to use this feature</p>
          <Button onClick={() => router.push("/auth")}>Sign In</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="email" onValueChange={(value) => setActiveTab(value as "email" | "upload" | "paste")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email">Email Scanner</TabsTrigger>
          <TabsTrigger value="upload">Upload Documents</TabsTrigger>
          <TabsTrigger value="paste">Paste Email</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connect Your Email</CardTitle>
              <CardDescription>We'll scan your emails for tax documents like 1099s and W2s</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEmailConnected ? (
                <>
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Email Integration</AlertTitle>
                    <AlertDescription>
                      We use secure OAuth to connect to your email provider. We never store your email password.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center gap-2 mb-4">
                    <Mail className="h-5 w-5 text-primary" />
                    <p className="font-medium">Gmail Integration</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Gmail Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="flex items-center justify-center bg-primary/10 rounded-full w-16 h-16 mb-4">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium">Connected to Gmail</h3>
                  <p className="text-sm text-muted-foreground mt-1">{email}</p>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={handleScanEmails} disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Scan for Tax Documents
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDisconnect}>
                      Disconnect
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            {!isEmailConnected && (
              <CardFooter>
                <Button onClick={handleConnectEmail} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Connect Email
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Email Feed */}
          {isEmailConnected && <EmailFeed userEmail={email} isAuthenticated={isEmailConnected} />}

          {documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Found Tax Documents</CardTitle>
                <CardDescription>We found {documents.length} tax-related documents in your emails</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 mr-2 text-blue-500" />
                            <h3 className="font-semibold">{doc.type}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">From: {doc.sender}</p>
                          <p className="text-sm text-muted-foreground">
                            Date: {new Date(doc.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" type="button">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" type="button">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="font-medium">{doc.subject}</p>
                        <p className="text-sm mt-1">{doc.preview}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Tax Documents</CardTitle>
              <CardDescription>Upload tax documents you've already downloaded or received</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="tax-document"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">PDF, JPG, or PNG files</p>
                  </div>
                  <input
                    id="tax-document"
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Selected Files:</h3>
                  <ul className="space-y-1">
                    {selectedFiles.map((file, index) => (
                      <li key={index} className="text-sm flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-blue-500" />
                        {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={handleFileUpload}
                disabled={uploadLoading || selectedFiles.length === 0}
              >
                {uploadLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Process Documents
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {processedDocuments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Processed Documents</CardTitle>
                <CardDescription>
                  We've extracted information from {processedDocuments.length} tax documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {processedDocuments.map((doc, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 mr-2 text-blue-500" />
                            <h3 className="font-semibold">{doc.extractedData.documentType}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">Issuer: {doc.extractedData.issuer}</p>
                          <p className="text-sm text-muted-foreground">Tax Year: {doc.extractedData.taxYear}</p>
                          <p className="text-sm text-muted-foreground">File: {doc.fileName}</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Financial Data:</h4>
                        <div className="bg-muted p-3 rounded-md">
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            {Object.entries(doc.extractedData.financialData).map(([key, value]) => (
                              <div key={key} className="col-span-1">
                                <dt className="font-medium">{key}:</dt>
                                <dd>{value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="paste" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paste Email Content</CardTitle>
              <CardDescription>
                Paste the content of a tax-related email to extract important information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="email-content">Email Content</Label>
                  <Button variant="outline" size="sm" onClick={handlePasteFromClipboard} type="button">
                    <Clipboard className="h-4 w-4 mr-2" />
                    Paste from Clipboard
                  </Button>
                </div>
                <Textarea
                  id="email-content"
                  placeholder="Paste the full content of your tax-related email here..."
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  className="min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  Include the full email with headers, subject, and body for best results.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handlePasteSubmit} disabled={pasteLoading} className="w-full">
                {pasteLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Analyze Email Content
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {processedDocuments.length > 0 && activeTab === "paste" && (
            <Card>
              <CardHeader>
                <CardTitle>Email Analysis Results</CardTitle>
                <CardDescription>We've extracted tax information from your email</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {processedDocuments.map((doc, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 mr-2 text-blue-500" />
                            <h3 className="font-semibold">{doc.extractedData.documentType}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">Issuer: {doc.extractedData.issuer}</p>
                          <p className="text-sm text-muted-foreground">Tax Year: {doc.extractedData.taxYear}</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Financial Data:</h4>
                        <div className="bg-muted p-3 rounded-md">
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            {Object.entries(doc.extractedData.financialData).map(([key, value]) => (
                              <div key={key} className="col-span-1">
                                <dt className="font-medium">{key}:</dt>
                                <dd>{value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
