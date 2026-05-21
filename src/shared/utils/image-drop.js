// OS / native file drag (vs in-app library drag).
export function isNativeFileDrag(event) {
    return event.dataTransfer.types.includes('Files');
}
// First file in the list whose MIME type is an image.
export function pickFirstImageFile(files) {
    if (!files?.length)
        return null;
    for (let i = 0; i < files.length; i++) {
        const f = files.item(i);
        if (f?.type.startsWith('image/'))
            return f;
    }
    return null;
}
