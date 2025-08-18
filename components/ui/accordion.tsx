import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "../../lib/utils"

const AccordionContext = React.createContext<{
  openItems: Set<string>
  toggleItem: (value: string) => void
}>({
  openItems: new Set(),
  toggleItem: () => {}
})

interface AccordionProps {
  type?: "single" | "multiple"
  className?: string
  children: React.ReactNode
}

const Accordion: React.FC<AccordionProps> = ({ type = "single", className, children }) => {
  const [openItems, setOpenItems] = React.useState<Set<string>>(new Set())

  const toggleItem = (value: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev)
      if (type === "single") {
        newSet.clear()
        if (!prev.has(value)) {
          newSet.add(value)
        }
      } else {
        if (prev.has(value)) {
          newSet.delete(value)
        } else {
          newSet.add(value)
        }
      }
      return newSet
    })
  }

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem }}>
      <div className={className}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

interface AccordionItemProps {
  value: string
  className?: string
  children: React.ReactNode
}

const AccordionItem: React.FC<AccordionItemProps> = ({ value, className, children }) => {
  return (
    <div className={cn("border-b", className)}>
      {children}
    </div>
  )
}

interface AccordionTriggerProps {
  value: string
  className?: string
  children: React.ReactNode
}

const AccordionTrigger: React.FC<AccordionTriggerProps> = ({ value, className, children }) => {
  const { openItems, toggleItem } = React.useContext(AccordionContext)
  const isOpen = openItems.has(value)

  return (
    <button
      onClick={() => toggleItem(value)}
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
        className
      )}
      data-state={isOpen ? "open" : "closed"}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </button>
  )
}

interface AccordionContentProps {
  value: string
  className?: string
  children: React.ReactNode
}

const AccordionContent: React.FC<AccordionContentProps> = ({ value, className, children }) => {
  const { openItems } = React.useContext(AccordionContext)
  const isOpen = openItems.has(value)

  if (!isOpen) return null

  return (
    <div className={cn("pb-4 pt-0", className)}>
      {children}
    </div>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }