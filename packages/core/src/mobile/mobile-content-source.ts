import { type ServerAuthenticationResult } from '../server/server-auth';
import { getServerConnectionKey } from '../server/server-session';
import { type ServerType } from '../server/server-types';

export interface MobileContentSource {
    id: string;
    title: string;
    type: ServerType;
    url: string;
}

export const getMobileContentSource = (
    authentication: ServerAuthenticationResult,
): MobileContentSource => ({
    id: getServerConnectionKey(authentication),
    title: authentication.title,
    type: authentication.type,
    url: authentication.url,
});

export const firstNonEmptyString = (...values: Array<string | undefined>) => {
    return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();
};
