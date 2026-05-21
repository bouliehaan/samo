export declare function emitPlayerSeek(ms: number): void;
export declare function subscribePlayerSeek(onChange: (properties: {
    timestamp: number;
}, prev?: {
    timestamp: number;
}) => void): () => void;
