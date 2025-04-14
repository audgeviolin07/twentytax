"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Star, StarOff, FileText, Trash, RefreshCw, AlertCircle } from "lucide-react"
import { fetchEmails } from "@/app/email-scanner/actions"
import { updateEmail, deleteEmails } from "@/app/email-scanner/db-actions"
import { getBrowserClient } from "@/utils/supabase"

interface Email {
  id: string
  from_address: string
  subject: string
  date: string
  preview: string
  read: boolean
  starred: boolean
  has_tax_document: boolean
  document_type?: string
}

interface EmailFeedProps {
  userEmail: string
  isAuthenticated: boolean
}

export function EmailFeed({ userEmail, isAuthenticated }: EmailFeedProps) {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("inbox")
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = getBrowserClient()

  useEffect(() => {
    if (isAuthenticated && user) {
      loadEmails()
    }
  }, [isAuthenticated, user])

  // Update the loadEmails function to handle authentication better
  const loadEmails = async () => {
    if (!isAuthenticated) return

    setLoading(true)
    try {
      // Fetch emails without relying on user authentication
      const fetchedEmails = await fetchEmails(userEmail, "gmail")
      setEmails(fetchedEmails)
    } catch (error: any) {
      console.error("Error loading emails:", error)
      toast({
        title: "Error loading emails",
        description: error.message || "Please try again later",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleSelectEmail = (emailId: string) => {
    setSelectedEmails((prev) => (prev.includes(emailId) ? prev.filter((id) => id !== emailId) : [...prev, emailId]))
  }

  const toggleStarEmail = async (emailId: string, isStarred: boolean, e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      // Update in the database
      await updateEmail(emailId, { starred: !isStarred })

      // Update local state
      setEmails((prev) => prev.map((email) => (email.id === emailId ? { ...email, starred: !isStarred } : email)))
    } catch (error: any) {
      toast({
        title: "Error updating email",
        description: error.message || "Please try again later",
        variant: "destructive",
      })
    }
  }

  const markAsRead = async (emailId: string, isRead: boolean) => {
    if (isRead) return // Already read

    try {
      // Update in the database
      await updateEmail(emailId, { read: true })

      // Update local state
      setEmails((prev) => prev.map((email) => (email.id === emailId ? { ...email, read: true } : email)))
    } catch (error: any) {
      toast({
        title: "Error marking email as read",
        description: error.message || "Please try again later",
        variant: "destructive",
      })
    }
  }

  const handleDeleteEmails = async () => {
    if (selectedEmails.length === 0) return

    try {
      // Delete from database
      await deleteEmails(selectedEmails)

      // Update local state
      setEmails((prev) => prev.filter((email) => !selectedEmails.includes(email.id)))
      setSelectedEmails([])

      toast({
        title: "Emails deleted",
        description: `${selectedEmails.length} email(s) moved to trash`,
      })
    } catch (error: any) {
      toast({
        title: "Error deleting emails",
        description: error.message || "Please try again later",
        variant: "destructive",
      })
    }
  }

  const refreshEmails = () => {
    loadEmails()
  }

  const filteredEmails = emails.filter((email) => {
    if (activeTab === "inbox") return true
    if (activeTab === "starred") return email.starred
    if (activeTab === "tax-documents") return email.has_tax_document
    return true
  })

  if (!isAuthenticated) {
    return (
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Not Connected</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Please connect your email account to view your emails and scan for tax documents.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Your Emails</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={refreshEmails} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeleteEmails} disabled={selectedEmails.length === 0}>
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="inbox" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="inbox">Inbox</TabsTrigger>
            <TabsTrigger value="starred">Starred</TabsTrigger>
            <TabsTrigger value="tax-documents">Tax Documents</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No emails found in this folder</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    className={`p-3 rounded-md border cursor-pointer transition-colors ${
                      email.read ? "bg-background" : "bg-primary/5 font-medium"
                    } hover:bg-muted`}
                    onClick={() => markAsRead(email.id, email.read)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedEmails.includes(email.id)}
                        onCheckedChange={() => toggleSelectEmail(email.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">{email.from_address}</span>
                            {email.has_tax_document && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <FileText className="h-3 w-3 mr-1" />
                                {email.document_type || "Tax Document"}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => toggleStarEmail(email.id, email.starred, e)}
                              className="text-muted-foreground hover:text-yellow-500 transition-colors"
                              aria-label={email.starred ? "Unstar email" : "Star email"}
                            >
                              {email.starred ? (
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              ) : (
                                <StarOff className="h-4 w-4" />
                              )}
                            </button>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(email.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <h4 className="font-medium mb-1 truncate">{email.subject}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">{email.preview}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
