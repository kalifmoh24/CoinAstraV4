import React from "react";
import {
  useGetMarketOverview,
  useGetMarketMovers,
  useListNews,
  getGetMarketOverviewQueryKey,
  getGetMarketMoversQueryKey,
  getListNewsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/format";
import { ArrowDownRight, ArrowUpRight, TrendingUp, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: overview, isLoading: isOverviewLoading } = useGetMarketOverview({
    query: { queryKey: getGetMarketOverviewQueryKey() }
  });

  const { data: movers, isLoading: isMoversLoading } = useGetMarketMovers({
    query: { queryKey: getGetMarketMoversQueryKey() }
  });

  const { data: news, isLoading: isNewsLoading } = useListNews({ limit: 5 }, {
    query: { queryKey: getListNewsQueryKey({ limit: 5 }) }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Market Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time macro intelligence and crypto sentiment.</p>
        </div>
        <div className="flex items-center gap-3">
          {isOverviewLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : overview ? (
            <div className={`px-4 py-2 flex items-center gap-2 rounded-full border ${overview.fearGreedIndex < 40 ? 'bg-destructive/10 border-destructive/30 text-destructive' : overview.fearGreedIndex > 60 ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-secondary border-border text-foreground'}`}>
              <AlertTriangle className="h-4 w-4" />
              <span className="font-bold text-sm">F&G: {overview.fearGreedIndex} ({overview.fearGreedLabel})</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="BTC Price" 
          value={overview?.btcPrice} 
          change={overview?.btcChange24h} 
          isCurrency 
          isLoading={isOverviewLoading} 
        />
        <MetricCard 
          title="ETH Price" 
          value={overview?.ethPrice} 
          change={overview?.ethChange24h} 
          isCurrency 
          isLoading={isOverviewLoading} 
        />
        <MetricCard 
          title="Total Market Cap" 
          value={overview?.totalMarketCap} 
          isCurrency 
          isLoading={isOverviewLoading} 
        />
        <MetricCard 
          title="24h Volume" 
          value={overview?.totalVolume24h} 
          isCurrency 
          isLoading={isOverviewLoading} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-card-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Top Gainers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isMoversLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="space-y-1">
                  {movers?.gainers.slice(0, 5).map(token => (
                    <div key={token.symbol} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0">
                          {token.symbol.substring(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold">{token.symbol}</div>
                          <div className="text-xs text-muted-foreground">{token.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-medium">{formatCurrency(token.price)}</div>
                        <div className="text-xs text-primary font-bold flex items-center justify-end gap-1">
                          <ArrowUpRight className="h-3 w-3" /> {formatPercent(token.priceChange24h)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-card-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Latest Signals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isNewsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {news?.map(item => (
                    <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="block group">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${
                            item.sentiment === 'bullish' ? 'bg-primary/20 text-primary' :
                            item.sentiment === 'bearish' ? 'bg-destructive/20 text-destructive' :
                            'bg-secondary text-muted-foreground'
                          }`}>
                            {item.sentiment.toUpperCase()}
                          </span>
                          <span className="text-muted-foreground">{item.source}</span>
                        </div>
                        <h4 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-2">
                          {item.title}
                        </h4>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, change, isCurrency, isLoading }: { title: string, value?: number, change?: number, isCurrency?: boolean, isLoading?: boolean }) {
  return (
    <Card className="border-card-border bg-card">
      <CardContent className="p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
        {isLoading ? (
          <Skeleton className="h-8 w-24 mb-1" />
        ) : (
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold tracking-tight">
              {isCurrency ? formatCurrency(value) : formatNumber(value)}
            </span>
            {change !== undefined && (
              <span className={`text-sm font-bold flex items-center ${change >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {change >= 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                {formatPercent(Math.abs(change))}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
