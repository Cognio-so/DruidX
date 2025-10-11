import prisma from "@/lib/prisma";
import { requireAdmin } from "./requireAdmin";

export interface DashboardMetrics {
  totalUsers: number;
  totalGpts: number;
  totalConversations: number;
  totalMessages: number;
  activeUsers: number;
  recentConversations: number;
  userGrowth: number;
  conversationGrowth: number;
}

export interface ChartData {
  name: string;
  value: number;
  date?: string;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  await requireAdmin();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get basic counts
  const [
    totalUsers,
    totalGpts,
    totalConversations,
    totalMessages,
    activeUsers,
    recentConversations,
    usersLastMonth,
    conversationsLastMonth,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.gpt.count(),
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.user.count({
      where: {
        sessions: {
          some: {
            expiresAt: {
              gt: now,
            },
          },
        },
      },
    }),
    prisma.conversation.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),
    prisma.conversation.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),
  ]);

  // Calculate growth percentages
  const userGrowth = totalUsers > 0 ? (usersLastMonth / totalUsers) * 100 : 0;
  const conversationGrowth = totalConversations > 0 ? (conversationsLastMonth / totalConversations) * 100 : 0;

  return {
    totalUsers,
    totalGpts,
    totalConversations,
    totalMessages,
    activeUsers,
    recentConversations,
    userGrowth: Math.round(userGrowth * 100) / 100,
    conversationGrowth: Math.round(conversationGrowth * 100) / 100,
  };
}

export async function getUserGrowthData(): Promise<ChartData[]> {
  await requireAdmin();

  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);

  const userData = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: sixMonthsAgo,
      },
    },
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Group by month
  const monthlyData: { [key: string]: number } = {};
  
  userData.forEach(user => {
    const month = user.createdAt.toISOString().slice(0, 7); // YYYY-MM format
    monthlyData[month] = (monthlyData[month] || 0) + 1;
  });

  // Fill in missing months with 0
  const result: ChartData[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 30 * 24 * 60 * 60 * 1000);
    const month = date.toISOString().slice(0, 7);
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    
    result.push({
      name: monthName,
      value: monthlyData[month] || 0,
      date: month,
    });
  }

  return result;
}

export async function getConversationTrends(): Promise<ChartData[]> {
  await requireAdmin();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const conversationData = await prisma.conversation.findMany({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Group by day
  const dailyData: { [key: string]: number } = {};
  
  conversationData.forEach(conversation => {
    const day = conversation.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD format
    dailyData[day] = (dailyData[day] || 0) + 1;
  });

  // Fill in missing days with 0
  const result: ChartData[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const day = date.toISOString().slice(0, 10);
    const dayName = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    result.push({
      name: dayName,
      value: dailyData[day] || 0,
      date: day,
    });
  }

  return result;
}

export async function getGptUsageStats(): Promise<ChartData[]> {
  await requireAdmin();

  const gptStats = await prisma.gpt.findMany({
    include: {
      _count: {
        select: {
          conversations: true,
        },
      },
    },
    orderBy: {
      conversations: {
        _count: 'desc',
      },
    },
    take: 10,
  });

  return gptStats.map(gpt => ({
    name: gpt.name,
    value: gpt._count.conversations,
  }));
}

export async function getRecentActivity() {
  await requireAdmin();

  const [recentConversations, recentUsers, recentGpts] = await Promise.all([
    prisma.conversation.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        gpt: {
          select: {
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.gpt.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
    }),
  ]);

  return {
    recentConversations,
    recentUsers,
    recentGpts,
  };
}
