import prisma from '../config/database';

export class NotificationService {
  public static async getUserNotifications(bizId: bigint, userId: string | number) {
    const uId = BigInt(userId);
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { bizId, userId: uId },
        take: 50,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({
        where: { bizId, userId: uId, readAt: null },
      }),
    ]);

    return {
      unreadCount,
      notifications: notifications.map((n) => ({
        ...n,
        id: n.id.toString(),
        userId: n.userId.toString(),
        entityId: n.entityId?.toString(),
      })),
    };
  }

  public static async markAsRead(id: string | number) {
    const nId = BigInt(id);
    await prisma.notification.update({
      where: { id: nId },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  public static async markAllAsRead(bizId: bigint, userId: string | number) {
    const uId = BigInt(userId);
    await prisma.notification.updateMany({
      where: { bizId, userId: uId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }
}
