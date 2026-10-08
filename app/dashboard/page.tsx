import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InterviewList, Interview } from "@/features/interview/components/interview-list";
import { StartInterviewButton } from "@/features/interview/components/start-interview-button";
import { ProgressChart } from "@/features/dashboard/components/progress-chart";

export default async function DashboardPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) redirect("/sign-in");

  let initialInterviews: Interview[] = [];
  let chartInterviews: Array<{
    id: string;
    createdAt: Date;
    report: { overallScore: number } | null;
  }> = [];
  let totalInterviews = 0;

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (user) {
      // Fetch historical completed interviews with reports for the performance trend
      const [historyInterviews, recentInterviews, totalCount] = await Promise.all([
        prisma.interview.findMany({
          where: {
            userId: user.id,
            report: { isNot: null },
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            createdAt: true,
            report: {
              select: { overallScore: true },
            },
          },
          take: 100,
        }),
        prisma.interview.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            language: true,
            difficulty: true,
            duration: true,
            status: true,
            problemTitle: true,
            startedAt: true,
            endedAt: true,
            createdAt: true,
            report: {
              select: { overallScore: true },
            },
          },
          take: 20,
        }),
        prisma.interview.count({
          where: { userId: user.id },
        }),
      ]);

      chartInterviews = historyInterviews;
      initialInterviews = recentInterviews;
      totalInterviews = totalCount;
    }
  } catch {
    // Database not connected or loading error — fallback to empty state
    console.log("Database not available — showing empty state");
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Welcome + CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Practice coding interviews with an AI interviewer.
          </p>
        </div>
        <StartInterviewButton />
      </div>

      {/* Performance Trend (Horizontally scrollable if > 10 interviews) */}
      <ProgressChart interviews={chartInterviews} />

      {/* Previous Interviews (Max 20 visible per page, with clean async Next page fetching) */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground">
          Previous Interviews
        </h2>
        <div className="mt-4">
          <InterviewList
            initialInterviews={initialInterviews}
            totalCount={totalInterviews}
            pageSize={20}
          />
        </div>
      </section>
    </div>
  );
}
