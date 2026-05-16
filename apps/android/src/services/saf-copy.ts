import { NativeModules } from 'react-native';

interface SamoFileSystemNative {
    streamCopyToSaf(
        sourceFileUri: string,
        parentTreeUri: string,
        fileName: string,
        mimeType: string,
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
