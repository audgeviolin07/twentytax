"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FileText, Mail, CreditCard } from "lucide-react"
import { UserProfile } from "@/components/user-profile"

export function MainNav() {
  const pathname = usePathname()

  const routes = [
    {
      href: "/",
      label: "Home",
      active: pathname === "/",
    },
    {
      href: "/irs-requirements",
      label: "What YOU Have to Do for Taxes",
      active: pathname === "/irs-requirements",
      icon: <FileText className="mr-2 h-4 w-4" />,
    },
    {
      href: "/email-scanner",
      label: "Email Scanner",
      active: pathname === "/email-scanner",
      icon: <Mail className="mr-2 h-4 w-4" />,
    },
    {
      href: "/expense-classifier",
      label: "Expense Classifier",
      active: pathname === "/expense-classifier",
      icon: <CreditCard className="mr-2 h-4 w-4" />,
    },
  ]

  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex gap-6 md:gap-10">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold text-xl">TaxHelper</span>
        </Link>
        <nav className="hidden md:flex items-center space-x-2">
          {routes.map((route) =>
            route.href === "/" ? null : (
              <Button key={route.href} variant={route.active ? "default" : "ghost"} asChild>
                <Link href={route.href} className="flex items-center">
                  {route.icon}
                  {route.label}
                </Link>
              </Button>
            ),
          )}
        </nav>
      </div>
      <div className="flex items-center space-x-4">
        <UserProfile />
      </div>
    </div>
  )
}
