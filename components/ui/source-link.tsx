"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface SourceLinkProps {
  url: string;
  title?: string;
  className?: string;
}

export const SourceLink = React.forwardRef<HTMLButtonElement, SourceLinkProps>(
  ({ url, title, className }, ref) => {
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      window.open(url, "_blank", "noopener,noreferrer");
    };

    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        onClick={handleClick}
        className={cn(
          "h-5 w-5 ml-1 inline-flex items-center justify-center hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors",
          className
        )}
        aria-label={`View source: ${title || "External link"}`}
        title={`View source: ${title || "External link"}`}
      >
        <ExternalLink className="h-3 w-3" />
      </Button>
    );
  }
);

SourceLink.displayName = "SourceLink";