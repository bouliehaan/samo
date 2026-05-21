export declare function getDefaultTranscodingProfiles(): {
    audioCodec: string;
    container: string;
    protocol: string;
}[];
export declare function getDirectPlayProfiles(): {
    audioCodecs: string[];
    containers: string[];
    protocols: string[];
}[];
export declare const AudioPlayers: () => import("react/jsx-runtime").JSX.Element;
