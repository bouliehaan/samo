import { ReactNode } from 'react';

import { ContextMenu } from '/@/shared/components/context-menu/context-menu';

export interface LyricsContextMenuProps {
    canExport: boolean;
    canSearch: boolean;
    canTranslate: boolean;
    children: ReactNode;
    hasOffset: boolean;
    hasOverride: boolean;
    isShowingTranslation: boolean;
    languages?: null | { label: string; value: string }[];
    onAdjustOffset: (deltaMs: number) => void;
    onClearOverride: () => void;
    onExport: () => void;
    onPickLanguage?: (index: number) => void;
    onResetOffset: () => void;
    onSearchOverride: () => void;
    onSuppress: () => void;
    onToggleTranslation: () => void;
    selectedLanguage?: number;
}

export const LyricsContextMenu = ({
    canExport,
    canSearch,
    canTranslate,
    children,
    hasOffset,
    hasOverride,
    isShowingTranslation,
    languages,
    onAdjustOffset,
    onClearOverride,
    onExport,
    onPickLanguage,
    onResetOffset,
    onSearchOverride,
    onSuppress,
    onToggleTranslation,
    selectedLanguage,
}: LyricsContextMenuProps) => {
    const showLanguagePicker = languages && languages.length > 1;

    return (
        <ContextMenu>
            <ContextMenu.Target>
                <div style={{ height: '100%', minHeight: 0, width: '100%' }}>{children}</div>
            </ContextMenu.Target>
            <ContextMenu.Content>
                <ContextMenu.Submenu>
                    <ContextMenu.SubmenuTarget>
                        <ContextMenu.Item leftIcon="duration">Adjust sync</ContextMenu.Item>
                    </ContextMenu.SubmenuTarget>
                    <ContextMenu.SubmenuContent>
                        <ContextMenu.Item leftIcon="minus" onSelect={() => onAdjustOffset(-100)}>
                            100 ms earlier
                        </ContextMenu.Item>
                        <ContextMenu.Item leftIcon="minus" onSelect={() => onAdjustOffset(-50)}>
                            50 ms earlier
                        </ContextMenu.Item>
                        <ContextMenu.Item leftIcon="minus" onSelect={() => onAdjustOffset(-20)}>
                            20 ms earlier
                        </ContextMenu.Item>
                        <ContextMenu.Divider />
                        <ContextMenu.Item leftIcon="plus" onSelect={() => onAdjustOffset(20)}>
                            20 ms later
                        </ContextMenu.Item>
                        <ContextMenu.Item leftIcon="plus" onSelect={() => onAdjustOffset(50)}>
                            50 ms later
                        </ContextMenu.Item>
                        <ContextMenu.Item leftIcon="plus" onSelect={() => onAdjustOffset(100)}>
                            100 ms later
                        </ContextMenu.Item>
                        {hasOffset && (
                            <>
                                <ContextMenu.Divider />
                                <ContextMenu.Item leftIcon="refresh" onSelect={onResetOffset}>
                                    Reset to default
                                </ContextMenu.Item>
                            </>
                        )}
                    </ContextMenu.SubmenuContent>
                </ContextMenu.Submenu>

                {showLanguagePicker && onPickLanguage && (
                    <ContextMenu.Submenu>
                        <ContextMenu.SubmenuTarget>
                            <ContextMenu.Item leftIcon="metadata">Switch language</ContextMenu.Item>
                        </ContextMenu.SubmenuTarget>
                        <ContextMenu.SubmenuContent>
                            {languages.map((lang) => {
                                const idx = parseInt(lang.value, 10);
                                return (
                                    <ContextMenu.Item
                                        isSelected={idx === selectedLanguage}
                                        key={lang.value}
                                        onSelect={() => onPickLanguage(idx)}
                                    >
                                        {lang.label}
                                    </ContextMenu.Item>
                                );
                            })}
                        </ContextMenu.SubmenuContent>
                    </ContextMenu.Submenu>
                )}

                {canTranslate && (
                    <ContextMenu.Item
                        leftIcon={isShowingTranslation ? 'check' : 'metadata'}
                        onSelect={onToggleTranslation}
                    >
                        {isShowingTranslation ? 'Hide translation' : 'Show translation'}
                    </ContextMenu.Item>
                )}

                <ContextMenu.Divider />

                {canSearch && (
                    <ContextMenu.Item leftIcon="search" onSelect={onSearchOverride}>
                        Find different lyrics…
                    </ContextMenu.Item>
                )}

                {hasOverride && (
                    <ContextMenu.Item leftIcon="refresh" onSelect={onClearOverride}>
                        Use automatic lyrics
                    </ContextMenu.Item>
                )}

                <ContextMenu.Item leftIcon="x" onSelect={onSuppress}>
                    Hide lyrics for this song
                </ContextMenu.Item>

                {canExport && (
                    <>
                        <ContextMenu.Divider />
                        <ContextMenu.Item leftIcon="download" onSelect={onExport}>
                            Export lyrics…
                        </ContextMenu.Item>
                    </>
                )}
            </ContextMenu.Content>
        </ContextMenu>
    );
};
