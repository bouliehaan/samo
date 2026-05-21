import { cleanNotifications, cleanNotificationsQueue, hideNotification, notifications, updateNotification, } from '@mantine/notifications';
import clsx from 'clsx';
import styles from './toast.module.css';
const getTitle = (type) => {
    if (type === 'success')
        return 'Success';
    if (type === 'warning')
        return 'Warning';
    if (type === 'error')
        return 'Error';
    if (type === 'info')
        return 'Info';
    return undefined;
};
const showToast = ({ message, onClose, type, ...props }) => {
    return notifications.show({
        title: getTitle(type),
        withBorder: false,
        withCloseButton: true,
        ...props,
        classNames: {
            body: styles.body,
            closeButton: styles.closeButton,
            description: styles.description,
            loader: styles.loader,
            root: clsx(styles.root, {
                [styles.error]: type === 'error',
                [styles.info]: type === 'info',
                [styles.success]: type === 'success',
                [styles.warning]: type === 'warning',
            }),
            title: styles.title,
        },
        message: message ?? '',
        onClose,
    });
};
export const toast = {
    clean: cleanNotifications,
    cleanQueue: cleanNotificationsQueue,
    error: (props) => showToast({ type: 'error', ...props }),
    hide: hideNotification,
    info: (props) => showToast({ type: 'info', ...props }),
    show: showToast,
    success: (props) => showToast({ type: 'success', ...props }),
    update: updateNotification,
    warn: (props) => showToast({ type: 'warning', ...props }),
};
