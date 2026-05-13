export interface SamoMobileTabDefinition {
    id: SamoMobileTabId;
    label: string;
}

export type SamoMobileTabId = 'home' | 'library' | 'listen' | 'playlists' | 'search';

export const SAMO_MOBILE_TABS = [
    { id: 'home', label: 'Home' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'library', label: 'Library' },
    { id: 'listen', label: 'Listen' },
    { id: 'search', label: 'Search' },
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
