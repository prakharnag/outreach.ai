"use client";

import { ExternalLink, Link } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanyLinkProps {
  url: string;
  title?: string;
  className?: string;
  showIcon?: boolean;
}

export function CompanyLink({ url, title, className, showIcon = true }: CompanyLinkProps) {
  const displayTitle = title || new URL(url).hostname.replace('www.', '');
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline transition-colors",
        "font-medium text-sm",
        className
      )}
    >
      <Link className="h-3 w-3" />
      <span>{displayTitle}</span>
      {showIcon && <ExternalLink className="h-3 w-3" />}
    </a>
  );
}