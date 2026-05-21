export const normalizeServerUrl = (url) => {
    // Remove trailing slash
    return url.endsWith('/') ? url.slice(0, -1) : url;
};
export const getServerUrl = (server, forceRemoteUrl) => {
    if (!server) {
        return undefined;
    }
    if (!forceRemoteUrl && !server.preferRemoteUrl) {
        return server.url;
    }
    if (!server.remoteUrl) {
        return server.url;
    }
    return server.remoteUrl;
};
