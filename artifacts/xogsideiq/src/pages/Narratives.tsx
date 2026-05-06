import React from "react";
import { useListNarratives, getListNarrativesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { formatPercent } from "@/lib/format";
import * as Icons from "lucide-react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function Narratives() {
  const { data: narratives, isLoading } = useListNarratives({
    query: { queryKey: getListNarrativesQueryKey() }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Crypto Narratives</h1>
        <p className="text-muted-foreground mt-1">Track sector momentum and discover emerging trends.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))
        ) : (
          narratives?.map(narrative => {
            // @ts-ignore - Lucide icons map
            const Icon = Icons[narrative.iconKey] || Icons.Box;
            
            return (
              <Link key={narrative.id} href={`/narratives/${narrative.slug}`}>
                <Card className="h-full border-card-border bg-card hover:bg-secondary/20 hover:border-primary/50 transition-all cursor-pointer group">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{narrative.name}</h3>
                          <div className="text-xs text-muted-foreground font-medium">
                            {narrative.tokenCount} Tokens
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Momentum</div>
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded bg-secondary font-mono font-bold text-sm">
                          {narrative.momentumScore}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-grow">
                      {narrative.description}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-border mt-auto">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1 font-medium">24H Perf</div>
                        <div className={`text-sm font-bold flex items-center ${narrative.perf24h >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {narrative.perf24h >= 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                          {formatPercent(Math.abs(narrative.perf24h))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1 font-medium">7D Perf</div>
                        <div className={`text-sm font-bold flex items-center ${narrative.perf7d >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {narrative.perf7d >= 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                          {formatPercent(Math.abs(narrative.perf7d))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })
        )}
      </div>
    </div>
  );
}
