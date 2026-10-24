"use client";

import { useState } from "react";
import { Copy, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Turns the agent's one deciding question into an email the broker can send the importer.
export function draftEmail(brokerName: string, product: string, question: string) {
  return `Subject: Quick question on "${product}" for your customs entry

Hi,

We're preparing the customs declaration for your shipment and need one detail to choose the right commodity code for:

  ${product}

${question}

A product spec sheet or a photo of the label would also do. As soon as we hear back, we'll finalise the code.

Thanks,
${brokerName} classification team`;
}

export function ClientEmailButton({ brokerName, product, question }: { brokerName: string; product: string; question: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="link"
        className="h-auto p-0 text-xs"
        onClick={(e) => {
          e.stopPropagation();
          setText(draftEmail(brokerName, product, question));
          setCopied(false);
          setOpen(true);
        }}
      >
        <Mail className="size-3.5" /> Draft email to client
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Ask the client</DialogTitle>
            <DialogDescription>The one question that decides the code. Edit it, then copy it into your email.</DialogDescription>
          </DialogHeader>
          <Textarea rows={14} className="font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} />
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            }}
          >
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy email"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
