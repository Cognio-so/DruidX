import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionCards } from "./section-cards";
import { ChartAreaInteractive } from "./chart-area-interactive";
import { RecentActivityTable } from "./recent-activity-table";
import { 
  getDashboardMetrics, 
  getUserGrowthData, 
  getConversationTrends, 
  getGptUsageStats,
  getRecentActivity 
} from "@/data/get-dashboard-metrics";

// Loading skeleton components
function MetricsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Async data fetching components
async function MetricsCards() {
  const metrics = await getDashboardMetrics();
  return <SectionCards metrics={metrics} />;
}

async function UserGrowthChart() {
  const data = await getUserGrowthData();
  return (
    <ChartAreaInteractive
      data={data}
      title="User Growth"
      description="New user registrations over the last 6 months"
      color="hsl(var(--primary))"
    />
  );
}

async function ConversationTrendsChart() {
  const data = await getConversationTrends();
  return (
    <ChartAreaInteractive
      data={data}
      title="Conversation Trends"
      description="Daily conversation volume over the last 30 days"
      color="hsl(var(--chart-2))"
    />
  );
}

async function GptUsageChart() {
  const data = await getGptUsageStats();
  return (
    <ChartAreaInteractive
      data={data}
      title="GPT Usage Statistics"
      description="Most popular GPTs by conversation count"
      color="hsl(var(--chart-3))"
    />
  );
}

async function RecentActivityData() {
  const data = await getRecentActivity();

  const fixedRecentGpts = data.recentGpts.map((gpt: any) => ({
    id: gpt.id,
    name: gpt.name,
    image: gpt.image ?? null,
    createdAt: gpt.createdAt,
    user: { name: gpt.user?.name ?? null },
    _count: { conversations: gpt._count?.conversations ?? 0 }
  }));

  return <RecentActivityTable data={{ ...data, recentGpts: fixedRecentGpts }} />;
}

// Main dashboard component
export function DashboardOverview() {
  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <Suspense fallback={<MetricsSkeleton />}>
        <MetricsCards />
      </Suspense>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <UserGrowthChart />
        </Suspense>
        
        <Suspense fallback={<ChartSkeleton />}>
          <ConversationTrendsChart />
        </Suspense>
      </div>

      {/* GPT Usage Chart - Full Width */}
      <Suspense fallback={<ChartSkeleton />}>
        <GptUsageChart />
      </Suspense>

      {/* Recent Activity Tables */}
      <Suspense fallback={<TableSkeleton />}>
        <RecentActivityData />
      </Suspense>
    </div>
  );
}
