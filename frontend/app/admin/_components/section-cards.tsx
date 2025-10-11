import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Bot, 
  MessageSquare, 
  TrendingUp,
  TrendingDown,
  Clock
} from "lucide-react";
import { DashboardMetrics } from "@/data/get-dashboard-metrics";

interface SectionCardsProps {
  metrics: DashboardMetrics;
}

export function SectionCards({ metrics }: SectionCardsProps) {
  const cards = [
    {
      title: "Total Users",
      value: metrics.totalUsers.toLocaleString(),
      icon: Users,
      description: "Registered users",
      trend: metrics.userGrowth,
      trendLabel: "vs last month",
    },
    {
      title: "Total GPTs",
      value: metrics.totalGpts.toLocaleString(),
      icon: Bot,
      description: "Available GPTs",
      trend: null,
      trendLabel: null,
    },
    {
      title: "Conversations",
      value: metrics.totalConversations.toLocaleString(),
      icon: MessageSquare,
      description: "Total conversations",
      trend: metrics.conversationGrowth,
      trendLabel: "vs last month",
    },
    {
      title: "Recent Activity",
      value: metrics.recentConversations.toLocaleString(),
      icon: Clock,
      description: "Last 7 days",
      trend: null,
      trendLabel: null,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const isPositive = card.trend && card.trend > 0;
        const isNegative = card.trend && card.trend < 0;
        
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
                {card.trend !== null && (
                  <div className="flex items-center space-x-1">
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : isNegative ? (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    ) : null}
                    <Badge 
                      variant={isPositive ? "default" : isNegative ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {card.trend > 0 ? "+" : ""}{card.trend.toFixed(1)}%
                    </Badge>
                  </div>
                )}
              </div>
              {card.trendLabel && (
                <p className="text-xs text-muted-foreground mt-1">
                  {card.trendLabel}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
