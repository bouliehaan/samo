import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { closeAllModals, openModal } from '@mantine/modals';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import DOMPurify from 'dompurify';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import packageJson from '../../package.json';
import { formatHrDateTime } from '/@/renderer/utils/format';
import { Button } from '/@/shared/components/button/button';
import { Center } from '/@/shared/components/center/center';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Select } from '/@/shared/components/select/select';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { useLocalStorage } from '/@/shared/hooks/use-local-storage';
const GITHUB_RELEASES_URL = 'https://api.github.com/repos/bouliehaan/samo/releases';
const GITHUB_COMPARE_URL = 'https://api.github.com/repos/bouliehaan/samo/compare';
const RELEASES_TO_FETCH = 30;
function isAlphaVersion(version) {
    return version.includes('-alpha');
}
function parseVersionFromTag(tagName) {
    return tagName.startsWith('v') ? tagName.slice(1) : tagName;
}
function toTag(version) {
    return version.startsWith('v') ? version : `v${version}`;
}
const ReleaseNotesContent = ({ onDismiss, version }) => {
    const { t } = useTranslation();
    const [selectedVersion, setSelectedVersion] = useState(version);
    const isAlpha = isAlphaVersion(selectedVersion);
    // Fetch list of recent releases for the selector
    const { data: releasesList = [] } = useQuery({
        queryFn: async () => {
            const response = await axios.get(GITHUB_RELEASES_URL, {
                params: { per_page: RELEASES_TO_FETCH },
            });
            return response.data;
        },
        queryKey: ['github-releases-list'],
        retry: 2,
    });
    const latestStableRelease = useMemo(() => {
        return releasesList.find((r) => !r.prerelease);
    }, [releasesList]);
    const releaseOptions = useMemo(() => {
        const options = releasesList.slice(0, RELEASES_TO_FETCH).map((r) => {
            const v = parseVersionFromTag(r.tag_name);
            const dateStr = formatHrDateTime(r.published_at);
            return {
                label: dateStr ? `${v} - ${dateStr}` : v,
                value: v,
            };
        });
        const versions = options.map((o) => o.value);
        if (!versions.includes(version)) {
            options.unshift({ label: version, value: version });
        }
        return options;
    }, [releasesList, version]);
    // For alpha: fetch commits between latest stable and development branch
    const { data: compareData, isError: isCompareError, isLoading: isCompareLoading, } = useQuery({
        enabled: isAlpha && !!latestStableRelease,
        queryFn: async () => {
            const base = latestStableRelease.tag_name;
            const head = 'development';
            const response = await axios.get(`${GITHUB_COMPARE_URL}/${base}...${head}`, { params: { per_page: 100 } });
            return response.data;
        },
        queryKey: ['github-compare', latestStableRelease?.tag_name, 'development'],
        retry: 2,
    });
    // For non-alpha: fetch release by tag
    const { data: releaseData, isError, isLoading, } = useQuery({
        enabled: !isAlpha,
        queryFn: async () => {
            const response = await axios.get(`${GITHUB_RELEASES_URL}/tags/${toTag(selectedVersion)}`);
            return response.data;
        },
        queryKey: ['github-release', selectedVersion],
        retry: 2,
    });
    // Convert markdown to HTML using GitHub's markdown API
    const { data: htmlContent, isLoading: isConverting } = useQuery({
        enabled: !isAlpha && !!releaseData?.body,
        queryFn: async () => {
            const response = await axios.post('https://api.github.com/markdown', {
                mode: 'gfm',
                text: releaseData?.body ?? '',
            }, {
                headers: {
                    'Content-Type': 'application/json',
                },
                responseType: 'text',
            });
            return response.data;
        },
        queryKey: ['github-markdown', releaseData?.body],
        retry: 2,
    });
    const sanitizedHtml = useMemo(() => {
        if (!htmlContent)
            return '';
        return DOMPurify.sanitize(htmlContent, {
            ALLOWED_ATTR: ['alt', 'href', 'src', 'title'],
            ALLOWED_TAGS: [
                'a',
                'blockquote',
                'br',
                'code',
                'em',
                'h1',
                'h2',
                'h3',
                'h4',
                'h5',
                'h6',
                'img',
                'li',
                'ol',
                'p',
                'pre',
                'strong',
                'u',
                'ul',
            ],
        });
    }, [htmlContent]);
    const isLoadingState = isAlpha ? isCompareLoading : isLoading || isConverting;
    const isErrorState = isAlpha ? isCompareError : isError || !releaseData;
    if (isLoadingState) {
        return (_jsx(Center, { h: 400, children: _jsx(Spinner, {}) }));
    }
    if (isErrorState) {
        const showCompareError = isAlpha && latestStableRelease;
        return (_jsxs(Stack, { gap: "md", children: [releaseOptions.length > 1 && (_jsx(Select, { data: releaseOptions, onChange: (v) => v && setSelectedVersion(v), value: selectedVersion })), _jsx(Text, { size: "sm", children: t('error.genericError', { postProcess: 'sentenceCase' }) }), _jsxs(Group, { justify: "flex-end", children: [_jsx(Button, { component: "a", href: showCompareError
                                ? `https://github.com/bouliehaan/samo/compare/${latestStableRelease.tag_name}...${toTag(selectedVersion)}`
                                : `https://github.com/bouliehaan/samo/releases/tag/${toTag(selectedVersion)}`, onClick: onDismiss, rightSection: _jsx(Icon, { icon: "externalLink" }), target: "_blank", variant: "filled", children: t('common.viewReleaseNotes', { postProcess: 'sentenceCase' }) }), _jsx(Button, { onClick: onDismiss, variant: "default", children: t('common.dismiss', { postProcess: 'titleCase' }) })] })] }));
    }
    if (isAlpha && !latestStableRelease) {
        return (_jsxs(Stack, { gap: "md", children: [releaseOptions.length > 1 && (_jsx(Select, { data: releaseOptions, onChange: (v) => v && setSelectedVersion(v), value: selectedVersion })), _jsx(Text, { isMuted: true, size: "sm", children: t('page.releasenotes.noStableReleaseToCompare', {
                        postProcess: 'sentenceCase',
                    }) }), _jsxs(Group, { justify: "flex-end", children: [_jsx(Button, { component: "a", href: `https://github.com/bouliehaan/samo/releases/tag/${toTag(selectedVersion)}`, onClick: onDismiss, rightSection: _jsx(Icon, { icon: "externalLink" }), target: "_blank", variant: "subtle", children: t('action.viewMore', { postProcess: 'sentenceCase' }) }), _jsx(Button, { onClick: onDismiss, variant: "filled", children: t('common.dismiss', { postProcess: 'titleCase' }) })] })] }));
    }
    if (isAlpha && compareData) {
        const commits = compareData.commits ?? [];
        const compareUrl = `https://github.com/bouliehaan/samo/compare/${latestStableRelease?.tag_name}...development`;
        return (_jsxs(Stack, { gap: "md", children: [releaseOptions.length > 1 && (_jsx(Select, { data: releaseOptions, onChange: (v) => v && setSelectedVersion(v), value: selectedVersion })), _jsx(Text, { isMuted: true, size: "sm", children: t('page.releasenotes.commitsSinceStable', {
                        postProcess: 'sentenceCase',
                        stable: latestStableRelease
                            ? parseVersionFromTag(latestStableRelease.tag_name)
                            : '',
                    }) }), _jsx(ScrollArea, { style: {
                        height: '400px',
                    }, children: _jsx(Stack, { gap: "xs", children: commits.length === 0 ? (_jsx(Text, { isMuted: true, size: "sm", children: t('page.releasenotes.noNewCommits', {
                                postProcess: 'sentenceCase',
                            }) })) : (commits.map((c) => {
                            const firstLine = c.commit.message.split('\n')[0];
                            return (_jsxs(Group, { gap: "sm", style: { alignItems: 'flex-start' }, wrap: "nowrap", children: [_jsx(Text, { size: "sm", style: { flex: 1 }, title: c.commit.message, truncate: true, children: firstLine }), _jsx(Text, { isMuted: true, size: "xs", children: formatHrDateTime(c.commit.author.date) }), _jsx(Button, { component: "a", href: c.html_url, rightSection: _jsx(Icon, { icon: "externalLink" }), size: "compact-xs", target: "_blank", variant: "subtle", children: t('common.view', { postProcess: 'sentenceCase' }) })] }, c.sha));
                        })) }) }), _jsxs(Group, { justify: "flex-end", children: [_jsx(Button, { component: "a", href: compareUrl, onClick: onDismiss, rightSection: _jsx(Icon, { icon: "externalLink" }), target: "_blank", variant: "subtle", children: t('action.viewMore', { postProcess: 'sentenceCase' }) }), _jsx(Button, { onClick: onDismiss, variant: "filled", children: t('common.dismiss', { postProcess: 'titleCase' }) })] })] }));
    }
    return (_jsxs(Stack, { gap: "md", children: [releaseOptions.length > 1 && (_jsx(Select, { data: releaseOptions, onChange: (v) => v && setSelectedVersion(v), value: selectedVersion })), _jsx(ScrollArea, { style: {
                    height: '400px',
                }, children: _jsx(Text, { dangerouslySetInnerHTML: { __html: sanitizedHtml }, fw: 400, lh: "1.5", size: "md" }) }), _jsxs(Group, { justify: "flex-end", children: [_jsx(Button, { component: "a", href: `https://github.com/bouliehaan/samo/releases/tag/${toTag(selectedVersion)}`, onClick: onDismiss, rightSection: _jsx(Icon, { icon: "externalLink" }), target: "_blank", variant: "subtle", children: t('action.viewMore', { postProcess: 'sentenceCase' }) }), _jsx(Button, { onClick: onDismiss, variant: "filled", children: t('common.dismiss', { postProcess: 'titleCase' }) })] })] }));
};
const WAIT_FOR_LOCAL_STORAGE = 1000 * 2;
const ReleaseNotesModalContentWrapper = ({ setDismissRef, }) => {
    const { version } = packageJson;
    const [, setValue] = useLocalStorage({ key: 'version' });
    const handleDismiss = useCallback(() => {
        setValue(version);
        closeAllModals();
    }, [setValue, version]);
    useEffect(() => {
        setDismissRef?.(handleDismiss);
        return () => setDismissRef?.(undefined);
    }, [handleDismiss, setDismissRef]);
    return _jsx(ReleaseNotesContent, { onDismiss: handleDismiss, version: version });
};
export const openReleaseNotesModal = (title) => {
    const dismissRef = { current: null };
    openModal({
        children: (_jsx(ReleaseNotesModalContentWrapper, { setDismissRef: (fn) => {
                dismissRef.current = fn ?? null;
            } })),
        onClose: () => dismissRef.current?.(),
        size: 'xl',
        title,
    });
};
export const ReleaseNotesModal = () => {
    const { version } = packageJson;
    const { t } = useTranslation();
    const dismissRef = useRef(null);
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const valueFromLocalStorage = localStorage.getItem('version');
            const versionString = `"${version}"`;
            // Only show modal if the stored version is different from current version
            if (valueFromLocalStorage !== versionString) {
                openModal({
                    children: (_jsx(ReleaseNotesModalContentWrapper, { setDismissRef: (fn) => {
                            dismissRef.current = fn ?? null;
                        } })),
                    onClose: () => dismissRef.current?.(),
                    size: 'xl',
                    title: t('common.newVersion', {
                        postProcess: 'sentenceCase',
                        version,
                    }),
                });
            }
        }, WAIT_FOR_LOCAL_STORAGE);
        return () => {
            clearTimeout(timeoutId);
        };
    }, [t, version]);
    return null;
};
