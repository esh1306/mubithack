"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Code } from "@/components/code";
import { PageHeader } from "@/components/page";

type Precedent = {
  id: number;
  lineText: string;
  oldCode: string;
  newCode: string;
  reason: string;
  createdAt: string;
  uses: number;
};

export function PrecedentsView({ broker }: { broker: string }) {
  const [list, setList] = useState<Precedent[] | null>(null);

  const load = useCallback(async () => {
    setList(await (await fetch(`/api/${broker}/precedents`)).json());
  }, [broker]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the fetch resolves
    load();
  }, [load]);

  async function remove(id: number) {
    await fetch(`/api/${broker}/precedents?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Precedents"
        info="precedents"
        description="Every fix your team makes, with the reason. The AI checks these first, for this broker only."
      />

      {list?.length === 0 && (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          No precedents yet. Fix a code on the{" "}
          <Link href={`/${broker}/classify`} className="text-primary underline-offset-4 hover:underline">
            Classify
          </Link>{" "}
          page and it shows up here.
        </div>
      )}

      <ul className="space-y-3">
        {list?.map((p) => (
          <li key={p.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <p className="text-xs text-muted-foreground">
                  #{p.id} · {new Date(p.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </p>
                <p className="font-medium">{p.lineText}</p>
                <div className="flex items-center gap-2 text-sm">
                  <Code code={p.oldCode} className="line-through opacity-50" />
                  <ArrowRight className="size-3.5 text-primary" />
                  <Code code={p.newCode} className="text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">“{p.reason}”</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="text-xs text-muted-foreground">
                  Followed {p.uses} {p.uses === 1 ? "time" : "times"}
                </span>
                <Button size="icon" variant="ghost" title="Delete precedent" onClick={() => remove(p.id)}>
                  <Trash2 />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
