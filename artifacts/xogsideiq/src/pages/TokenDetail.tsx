import React from "react";
import { Link, useLocation } from "wouter";
import { 
  useGetToken, getGetTokenQueryKey,
  useGetTokenScores, getGetTokenScoresQueryKey,
  useGetTokenAiResearch, getGetTokenAiResearchQueryKey,
  useGetTokenNews, getGetTokenNewsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownRight, ArrowUpRight, ArrowLeft, ExternalLink, FileText, BrainCircuit, Activity, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TokenDetail({ params }: { params: { symbol: string } }) {
  const symbol = params.symbol.toUpperCase();
  const [, setLocation] = useLocation();

  const { data: token, isLoading: isTokenLoading } = useGetToken(symbol, {
    query: { enabled: !!symbol, queryKey: getGetTokenQueryKey(symbol) }
  });

  const { data: scores, isLoading: isScoresLoading } = useGetTokenScores(symbol, {
    query: { enabled: !!symbol, queryKey: getGetTokenScoresQueryKey(symbol) }
  });

  const { data: aiResearch, isLoading: isAiLoading } = useGetTokenAiResearch(symbol, {
    query: { enabled: !!symbol, queryKey: getGetTokenAiResearchQueryKey(symbol) }
  });

  const { data: news, isLoading: isNewsLoading } = useGetTokenNews(symbol, {
    query: { enabled: !!symbol, queryKey: getGetTokenNewsQueryKey(symbol) }
  });

  if (isTokenLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-24 mb-4" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-2 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <h2 className="text-2xl font-bold mb-2">Token not found</h2>
        <p className="text-muted-foreground mb-6">Could not find data for {symbol}</p>
        <button 
          onClick={() => setLocation('/research')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium"
        >
          Back to Research
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <button 
          onClick={() => setLocation('/research')}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Research
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center font-bold text-xl shrink-0">
              {token.symbol.substring(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold tracking-tight">{token.name}</h1>
                <span className="text-xl text-muted-foreground font-medium">{token.symbol}</span>
                <span className="px-2 py-0.5 rounded-sm bg-secondary text-xs uppercase font-bold tracking-wider">{token.chain}</span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm">
                {token.websiteUrl && (
                  <a href={token.websiteUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                    <ExternalLink className="h-3 w-3" /> Website
                  </a>
                )}
                {token.whitepaperUrl && (
                  <a href={token.whitepaperUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                    <FileText className="h-3 w-3" /> Whitepaper
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:items-end">
            <div className="text-4xl font-mono font-bold tracking-tighter">
              {formatCurrency(token.price)}
            </div>
            <div className={`text-lg font-bold flex items-center gap-1 mt-1 ${
              (token.priceChange24h || 0) >= 0 ? 'text-primary' : 'text-destructive'
            }`}>
              {(token.priceChange24h || 0) >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
              {formatPercent(Math.abs(token.priceChange24h || 0))} (24h)
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBox label="Market Cap" value={formatCurrency(token.marketCap)} />
        <MetricBox label="24h Volume" value={formatCurrency(token.volume24h)} />
        <MetricBox label="FDV" value={formatCurrency(token.fdv)} />
        <MetricBox label="Circulating Supply" value={formatNumber(token.circulatingSupply)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-card-border bg-card">
            <CardHeader className="pb-4 border-b border-border">
              <CardTitle className="text-lg">Overview</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-muted-foreground leading-relaxed">
                {token.description || "No description available for this asset."}
              </p>
              
              {token.narratives && token.narratives.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Associated Narratives</h4>
                  <div className="flex flex-wrap gap-2">
                    {token.narratives.map(narrative => (
                      <Link key={narrative.id} href={`/narratives/${narrative.slug}`} className="px-3 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-sm font-medium transition-colors">
                        {narrative.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {isAiLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : aiResearch ? (
            <Card className="border-card-border bg-card overflow-hidden">
              <div className="bg-primary/10 border-b border-primary/20 px-6 py-4 flex items-center gap-3">
                <BrainCircuit className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-primary">AI Research Summary</h3>
                <div className="ml-auto">
                  <Badge variant="outline" className={`
                    ${aiResearch.opportunityLevel === 'very_high' ? 'border-primary text-primary' : ''}
                    ${aiResearch.opportunityLevel === 'high' ? 'border-primary/70 text-primary/70' : ''}
                    ${aiResearch.opportunityLevel === 'moderate' ? 'border-yellow-500 text-yellow-500' : ''}
                    ${aiResearch.opportunityLevel === 'low' ? 'border-destructive text-destructive' : ''}
                  `}>
                    {aiResearch.opportunityLevel.toUpperCase()} OPPORTUNITY
                  </Badge>
                </div>
              </div>
              <CardContent className="p-6 space-y-6">
                <p className="text-foreground leading-relaxed">{aiResearch.summary}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4" /> Strengths
                    </h4>
                    <ul className="space-y-2">
                      {aiResearch.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-destructive mb-3 uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Risks
                    </h4>
                    <ul className="space-y-2">
                      {aiResearch.risks.map((s, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-destructive mt-0.5">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="border-card-border bg-card">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg">Intelligence Scores</CardTitle>
              <CardDescription>Multi-factor fundamental analysis</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {isScoresLoading ? (
                <div className="space-y-4">
                  {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : scores ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border">
                    <span className="font-bold text-lg">Final Grade</span>
                    <GradeBadge grade={scores.finalGrade} size="lg" />
                  </div>
                  
                  <div className="space-y-4">
                    <ScoreBar label="Overall Score" score={scores.overallScore} />
                    <ScoreBar label="Fundamental" score={scores.fundamentalScore} />
                    <ScoreBar label="Technical" score={scores.technicalScore} />
                    <ScoreBar label="Sentiment" score={scores.sentimentScore} />
                    <ScoreBar label="Risk Assessment" score={scores.riskScore} inverted />
                    <ScoreBar label="Narrative Momentum" score={scores.narrativeMomentumScore} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Scores unavailable.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-card-border bg-card">
            <CardHeader className="pb-4 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> Related News
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              {isNewsLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : news && news.length > 0 ? (
                <div className="divide-y divide-border">
                  {news.map(item => (
                    <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="block p-4 hover:bg-secondary/30 transition-colors group">
                      <div className="space-y-2">
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
              ) : (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No recent news for {symbol}.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string, value: string }) {
  return (
    <div className="p-4 rounded-lg bg-card border border-card-border flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-lg font-mono font-bold">{value}</span>
    </div>
  );
}

function ScoreBar({ label, score, inverted = false }: { label: string, score: number, inverted?: boolean }) {
  // Score is 0-100
  let colorClass = "bg-primary";
  
  if (inverted) {
    if (score > 70) colorClass = "bg-destructive";
    else if (score > 40) colorClass = "bg-yellow-500";
  } else {
    if (score < 40) colorClass = "bg-destructive";
    else if (score < 70) colorClass = "bg-yellow-500";
  }

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-mono font-bold">{score}/100</span>
      </div>
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${colorClass}`} 
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function GradeBadge({ grade, size = "md" }: { grade?: string | null, size?: "sm" | "md" | "lg" }) {
  if (!grade) return <span className="text-muted-foreground">--</span>;
  
  let colorClass = "bg-secondary text-foreground";
  if (grade.startsWith("A")) colorClass = "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.2)]";
  else if (grade.startsWith("B")) colorClass = "bg-blue-500/20 text-blue-400 border border-blue-500/30";
  else if (grade.startsWith("C")) colorClass = "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
  else if (grade.startsWith("D") || grade.startsWith("F")) colorClass = "bg-destructive/20 text-destructive border border-destructive/30";

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-xl",
  };

  return (
    <span className={`inline-flex items-center justify-center rounded font-bold ${sizeClasses[size]} ${colorClass}`}>
      {grade}
    </span>
  );
}
