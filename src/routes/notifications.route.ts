import { UserController } from "../controllers/user.controller";
import {
  authenticateToken,
  authorizeApproved,
} from "../middleware/auth.middleware";
import router from "./user.routes";

// ==================== NOTIFICATION ROUTES ====================
router.get(
  "/notifications",
  authenticateToken,
  authorizeApproved,
  UserController.getNotifications,
);
router.put(
  "/notifications/read-all",
  authenticateToken,
  authorizeApproved,
  UserController.markAllNotificationsRead,
);
router.put(
  "/notifications/:notificationId",
  authenticateToken,
  authorizeApproved,
  UserController.markNotificationRead,
);
