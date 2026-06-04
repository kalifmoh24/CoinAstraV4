import React, { useState } from "react";
import { useListTokens, getListTokensQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal } from "lucide-react";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Research() {
  const [search, setSearch] = useState("");
  
  const { data: tokens, isLoading } = useListTokens(
    { q: search || undefined, limit: 50 },
    { query: { queryKey: getListTokensQueryKey({ q: search || undefined, limit: 50 }) } }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Research Terminal</h1>
        <p className="text-muted-foreground mt-1">Explore, screen, and grade crypto assets.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search tokens by symbol or name..." 
            className="pl-9 bg-card border-card-border focus-visible:ring-primary h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="h-11 px-4 flex items-center gap-2 border border-border bg-card rounded-md text-sm font-medium hover:bg-secondary transition-colors">
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <table className="w-full text-sm text-left">
          <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">24h Change</th>
              <th className="px-4 py-3 text-right">Market Cap</th>
              <th className="px-4 py-3 text-center">Score</th>
              <th className="px-4 py-3 text-center">Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y border-border">
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-4"><Skeleton className="h-6 w-32" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-6 w-20 ml-auto" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-6 w-16 ml-auto" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-6 w-24 ml-auto" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-6 w-12 mx-auto" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-6 w-10 mx-auto" /></td>
                </tr>
              ))
            ) : tokens?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No tokens found matching "{search}"
                </td>
              </tr>
            ) : (
              tokens?.map((token) => (
                <tr key={token.id} className="hover:bg-secondary/30 transition-colors group">
                  <td className="px-4 py-3">
                    <Link href={`/research/${token.symbol}`} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs">
                        {token.symbol.substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-foreground group-hover:text-primary transition-colors">{token.name}</div>
                        <div className="text-muted-foreground text-xs flex items-center gap-2">
                          <span>{token.symbol}</span>
                          <span className="px-1.5 py-0.5 rounded-sm bg-secondary text-[10px] uppercase">{token.chain}</span>
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">
                    {formatCurrency(token.price)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${
                    (token.priceChange24h || 0) >= 0 ? 'text-primary' : 'text-destructive'
                  }`}>
                    {(token.priceChange24h || 0) > 0 && '+'}{formatPercent(token.priceChange24h)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatCurrency(token.marketCap)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-secondary font-mono font-bold">
                      {token.overallScore}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <GradeBadge grade={token.finalGrade} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GradeBadge({ grade }: { grade?: string | null }) {
  if (!grade) return <span className="text-muted-foreground">--</span>;
  
  let colorClass = "bg-secondary text-foreground";
  if (grade.startsWith("A")) colorClass = "bg-primary/20 text-primary border border-primary/30";
  else if (grade.startsWith("B")) colorClass = "bg-blue-500/20 text-blue-400 border border-blue-500/30";
  else if (grade.startsWith("C")) colorClass = "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
  else if (grade.startsWith("D") || grade.startsWith("F")) colorClass = "bg-destructive/20 text-destructive border border-destructive/30";

  return (
    <span className={`inline-flex items-center justify-center px-2 py-1 rounded font-bold text-xs ${colorClass}`}>
      {grade}
    </span>
  );
}
