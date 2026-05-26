import { DeviceEventEmitter, NativeModules } from 'react-native';

interface SafListedFile {
    name: string;
    uri: string;
}

interface SamoFileSystemNative {
    cancelNativeDownload(downloadId: string): Promise<void>;
    downloadFile(
        downloadId: string,
        sourceUrl: string,
        destinationFileUri: string,
        headers?: Record<string, string>,
    ): Promise<{ bytesWritten?: number; totalBytes?: number; uri: string }>;
    listDownloadAudioFiles(treeUri: string): Promise<SafListedFile[]>;
    readTextDocument(documentUri: string): Promise<string>;
    setDownloadThrottle(bytesPerSecond: number): Promise<void>;
    streamCopyToSaf(
        sourceFileUri: string,
        parentTreeUri: string,
        fileName: string,
        mimeType: string,
    ): Promise<string>;
    writeTextDocument(
        treeUri: string,
        fileName: string,
        text: string,
    ): Promise<string>;
}

const native: SamoFileSystemNative | undefined =
    (NativeModules as Record<string, unknown>).SamoFileSystem as
        | SamoFileSystemNative
        | undefined;

/**
 * Stream a file:// source into a SAF (content://) tree directory chunk-by-
 * chunk via the native ContentResolver. Returns the resulting content://
 * document URI on success, or null on failure / when the native module isn't
 * available (e.g., the dev client hasn't been rebuilt since this module was
 * added).
 *
 * This is the streaming alternative to base64-round-tripping via the legacy
 * expo-file-system writeAsStringAsync — base64 fits the file as a single
 * string in memory, which OOMs on large audiobooks. The native bridge here
 * uses a 64KB buffer regardless of source size.
 */
export const streamCopyToSaf = async (
    sourceFileUri: string,
    parentTreeUri: string,
    fileName: string,
    mimeType: string,
): Promise<string | null> => {
    if (!native?.streamCopyToSaf) {
        return null;
    }
    try {
        return await native.streamCopyToSaf(
            sourceFileUri,
            parentTreeUri,
            fileName,
            mimeType,
        );
    } catch {
        return null;
    }
};

export const isNativeSafCopyAvailable = (): boolean =>
    typeof native?.streamCopyToSaf === 'function';

export const listSafDownloadAudioFiles = async (
    treeUri: string,
): Promise<SafListedFile[]> => {
    if (!native?.listDownloadAudioFiles) {
        return [];
    }
    try {
        const listed = await native.listDownloadAudioFiles(treeUri);
        return Array.isArray(listed) ? listed : [];
    } catch {
        return [];
    }
};

export const readSafTextDocument = async (documentUri: string): Promise<string | null> => {
    if (!native?.readTextDocument) {
        return null;
    }
    try {
        return await native.readTextDocument(documentUri);
    } catch {
        return null;
    }
};

export const writeSafTextDocument = async (
    treeUri: string,
    fileName: string,
    text: string,
): Promise<boolean> => {
    if (!native?.writeTextDocument) {
        return false;
    }
    try {
        await native.writeTextDocument(treeUri, fileName, text);
        return true;
    } catch {
        return false;
    }
};

export const isNativeDownloadAvailable = (): boolean =>
    typeof native?.downloadFile === 'function';

export const downloadFileNative = async (
    downloadId: string,
    sourceUrl: string,
    destinationFileUri: string,
    headers?: Record<string, string>,
) => {
    if (!native?.downloadFile) {
        return null;
    }
    return native.downloadFile(downloadId, sourceUrl, destinationFileUri, headers);
};

export const cancelNativeDownload = async (downloadId: string) => {
    if (!native?.cancelNativeDownload) {
        return;
    }
    await native.cancelNativeDownload(downloadId);
};

export const setNativeDownloadThrottle = async (bytesPerSecond: number) => {
    if (!native?.setDownloadThrottle) {
        return;
    }
    await native.setDownloadThrottle(bytesPerSecond);
};

export const subscribeNativeDownloadProgress = (
    listener: (event: { bytesWritten?: number; id?: string; totalBytes?: number }) => void,
) => {
    const subscription = DeviceEventEmitter.addListener('SamoFileDownloadProgress', listener);
    return () => subscription.remove();
};
