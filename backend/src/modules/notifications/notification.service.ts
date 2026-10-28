import { prisma } from "../../config/database";
import type { NotificationQuery } from "./notification.validation";

export class NotificationError extends Error {
constructor(
message: string,
public statusCode: number,
) {
super(message);
this.name = "NotificationError";
}
}

export interface CreateNotificationInput {
userId: string;
type: string;
title: string;
message: string;
data?: Record<string, unknown>;
}

/**

* Reusable notification creator.
*
* Other modules can call this after a booking or property event.
  */
  export async function createNotification(
  input: CreateNotificationInput,
  ) {
  return prisma.notification.create({
  data: {
  userId: input.userId,
  type: input.type,
  title: input.title,
  message: input.message,
  ...(input.data !== undefined
  ? { data: input.data as object }
  : {}),
  },
  });
  }

/**

* Return notifications belonging only to the authenticated user.
  */
  export async function listNotifications(
  userId: string,
  filters: NotificationQuery,
  ) {
  const { page, limit, unreadOnly } = filters;

const where = {
userId,
...(unreadOnly === "true" ? { isRead: false } : {}),
};

const [notifications, total, unreadCount] = await prisma.$transaction([
prisma.notification.findMany({
where,
skip: (page - 1) * limit,
take: limit,
orderBy: { createdAt: "desc" },
}),
prisma.notification.count({ where }),
prisma.notification.count({
where: {
userId,
isRead: false,
},
}),
]);

return {
notifications,
unreadCount,
pagination: {
page,
limit,
total,
totalPages: Math.ceil(total / limit),
},
};
}

/**

* Return the number of unread notifications for a user.
  */
  export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
  where: {
  userId,
  isRead: false,
  },
  });
  }

/**

* Mark one of the current user's notifications as read.
  */
  export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
  ) {
  const result = await prisma.notification.updateMany({
  where: {
  id: notificationId,
  userId,
  isRead: false,
  },
  data: {
  isRead: true,
  readAt: new Date(),
  },
  });

if (result.count === 0) {
const notification = await prisma.notification.findFirst({
where: {
id: notificationId,
userId,
},
select: {
id: true,
isRead: true,
},
});


if (!notification) {
  throw new NotificationError("Notification not found", 404);
}

// An already-read notification is still a successful operation.
return notification;


}

return prisma.notification.findFirstOrThrow({
where: {
id: notificationId,
userId,
},
});
}

/**

* Mark all unread notifications belonging to the current user as read.
  */
  export async function markAllNotificationsAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
  where: {
  userId,
  isRead: false,
  },
  data: {
  isRead: true,
  readAt: new Date(),
  },
  });

return {
updatedCount: result.count,
};
}

/**

* Delete a notification only when it belongs to the current user.
  */
  export async function deleteNotification(
  userId: string,
  notificationId: string,
  ) {
  const result = await prisma.notification.deleteMany({
  where: {
  id: notificationId,
  userId,
  },
  });

if (result.count === 0) {
throw new NotificationError("Notification not found", 404);
}
}
