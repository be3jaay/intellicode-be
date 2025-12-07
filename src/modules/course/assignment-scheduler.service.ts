import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Simple in-process scheduler that publishes assignments with post_later <= now
 * and is_published = false. Runs every minute. Uses loose typing (any)
 * to avoid compile errors until prisma client is regenerated.
 */
@Injectable()
export class AssignmentSchedulerService implements OnModuleInit, OnModuleDestroy {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async checkAndPublishDueAssignments(): Promise<void> {
    const now = new Date();

    // Find assignments that are scheduled to be published and not yet published
    const dueAssignments = await this.prisma.assignment.findMany({
      where: ({
        post_later: { lte: now },
        is_published: false,
      } as any),
      include: {
        module: {
          include: {
            // include course so we can notify enrolled students
            course: true,
          },
        },
      },
    } as any);

    if (!dueAssignments || dueAssignments.length === 0) return;

    // Publish each assignment and notify students
    for (const assignment of dueAssignments) {
      try {
        // Mark assignment as published
        await this.prisma.assignment.update({
          where: { id: assignment.id } as any,
          data: ({ is_published: true } as any),
        } as any);

        // Notify enrolled students using existing helper
  const courseId = (assignment as any).module?.course?.id || (assignment as any).module?.course_id;
  const moduleTitle = (assignment as any).module?.title || null;

        // eslint-disable-next-line no-console
        console.log('Scheduler publishing assignment', assignment.id, 'course', courseId);

        if (courseId) {
          await this.notifications.notifyStudentsNewAssignment(
            courseId,
            assignment.id,
            assignment.title,
            moduleTitle,
          );
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to publish scheduled assignment', assignment.id, err?.message || err);
      }
    }
  }

  onModuleInit(): any {
    // Run immediately, then every minute
    this.checkAndPublishDueAssignments().catch((err) => console.error(err));
    this.intervalId = setInterval(() => {
      this.checkAndPublishDueAssignments().catch((err) => console.error(err));
    }, 60 * 1000);

    // eslint-disable-next-line no-console
    console.log('AssignmentSchedulerService started (checks every 60s)');
  }

  onModuleDestroy(): any {
    if (this.intervalId) clearInterval(this.intervalId);
    // eslint-disable-next-line no-console
    console.log('AssignmentSchedulerService stopped');
  }
}
