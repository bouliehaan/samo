import { createContext, useContext } from 'react';

export const DownloadedCollectionKeysContext = createContext<Set<string>>(new Set());
export const DownloadedTrackKeysContext = createContext<Set<string>>(new Set());

export const useDownloadedCollectionKeys = () => useContext(DownloadedCollectionKeysContext);
export const useDownloadedTrackKeys = () => useContext(DownloadedTrackKeysContext);
