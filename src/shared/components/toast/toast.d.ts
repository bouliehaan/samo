import type { NotificationData } from '@mantine/notifications';
import { cleanNotifications, cleanNotificationsQueue, hideNotification, updateNotification } from '@mantine/notifications';
interface NotificationProps extends Omit<NotificationData, 'message'> {
    message?: string;
    onClose?: () => void;
    type?: 'error' | 'info' | 'success' | 'warning';
}
export declare const toast: {
    clean: typeof cleanNotifications;
    cleanQueue: typeof cleanNotificationsQueue;
    error: (props: NotificationProps) => string;
    hide: typeof hideNotification;
    info: (props: NotificationProps) => string;
    show: ({ message, onClose, type, ...props }: NotificationProps) => string;
    success: (props: NotificationProps) => string;
    update: typeof updateNotification;
    warn: (props: NotificationProps) => string;
};
export {};
