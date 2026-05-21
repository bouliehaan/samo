import { BrowserWindow } from 'electron';
import './features';
export declare const getMainWindow: () => BrowserWindow | null;
export declare const sendToastToRenderer: ({ message, type, }: {
    message: string;
    type: "error" | "info" | "success" | "warning";
}) => void;
