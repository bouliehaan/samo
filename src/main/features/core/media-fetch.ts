import { ipcMain } from 'electron';

export const registerMediaFetchHandlers = () => {
    ipcMain.handle(
        'fetch-media',
        async (
            _event,
            data: { headers?: Record<string, string>; url: string },
        ): Promise<{ contentType: string; data: string }> => {
            const response = await fetch(data.url, {
                headers: data.headers,
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch media: ${response.status}`);
            }

            const contentType =
                response.headers.get('content-type') ?? 'application/octet-stream';
            const buffer = Buffer.from(await response.arrayBuffer());

            return {
                contentType,
                data: buffer.toString('base64'),
            };
        },
    );
};

registerMediaFetchHandlers();
