export interface SamoMobileTabDefinition {
    id: SamoMobileTabId;
    label: string;
}
export type SamoMobileTabId = 'home' | 'library' | 'playlists' | 'radio' | 'search';
export declare const SAMO_MOBILE_TABS: ({
    id: "home";
    label: string;
} | {
    id: "search";
    label: string;
} | {
    id: "library";
    label: string;
} | {
    id: "playlists";
    label: string;
} | {
    id: "radio";
    label: string;
})[];
export interface SamoListenSectionDefinition {
    id: SamoListenSectionId;
    label: string;
}
export type SamoListenSectionId = 'audiobooks' | 'podcasts' | 'radio';
export declare const SAMO_LISTEN_SECTIONS: ({
    id: "audiobooks";
    label: string;
} | {
    id: "radio";
    label: string;
} | {
    id: "podcasts";
    label: string;
})[];
