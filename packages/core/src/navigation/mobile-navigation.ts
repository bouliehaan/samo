export interface SamoMobileTabDefinition {
    id: SamoMobileTabId;
    label: string;
}

export type SamoMobileTabId = 'audiobooks' | 'home' | 'playlists' | 'podcasts' | 'radio';

export const SAMO_MOBILE_TABS = [
    { id: 'home', label: 'Home' },
    { id: 'podcasts', label: 'Podcasts' },
    { id: 'audiobooks', label: 'Audiobooks' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'radio', label: 'Radio' },
] satisfies SamoMobileTabDefinition[];

export interface SamoListenSectionDefinition {
    id: SamoListenSectionId;
    label: string;
}

export type SamoListenSectionId = 'audiobooks' | 'podcasts' | 'radio';

export const SAMO_LISTEN_SECTIONS = [
    { id: 'audiobooks', label: 'Audiobooks' },
    { id: 'radio', label: 'Radio' },
    { id: 'podcasts', label: 'Podcasts' },
] satisfies SamoListenSectionDefinition[];
