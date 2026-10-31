import { MobileHomeSectionId } from '@samo/core/mobile';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, findNodeHandle, Text, View } from 'react-native';
import { useHomeDisplaySections } from '../hooks/use-home-display-sections';
import { useSamoRadioPolling } from '../hooks/use-samo-radio-device';
import {
    closeViewAll,
    getAppNavigation,
    popMediaDetail,
    useAppNavigationSelector,
} from '../state/app-navigation';
import { setOnboardingActive, useAuthSessionSelector } from '../state/auth-session';
import {
    getMediaOverlays,
    setContextMenuTarget,
    useMediaOverlaysSelector,
} from '../state/media-overlays';
import {
    closeTvPlayer,
    focusTvRail,
    getTvContentScope,
    goTvHome,
    runTvAction,
    useTvToast,
} from './tv-actions';
import { TvCollectionPage, TvSearch, TvViewAll } from './TvBrowse';
import { TvContextMenu } from './TvContextMenu';
import { enterTvScope, focusTvControl, TvFocusGuide, TvFocusScope } from './TvControls';
import { TvDetail } from './TvDetail';
import { TvFocusZone } from './TvFocusZone';
import {
    getTvBackZone,
    getTvLastZone,
    isTvSidewaysMove,
    noteTvKeyDown,
    setTvPlacementZone,
    shouldTvZoneTakeFocus,
} from './tv-focus';
import { TvHomePage } from './TvHome';
import { installTvKeys } from './tv-keys';
import { getTvBackAction, selectTvPage, type TvPage } from './tv-navigation';
import { TvPlayer } from './TvPlayer';
import { TvRadio, TvRadioPanel, TvRadioPanelContext, type TvRadioPanelSelection } from './TvRadio';
import { TvRail } from './TvRail';
import { installTvScreenAwake } from './tv-screen-awake';
import { TvSettings, TvSetup } from './TvSetup';
import { tvStyles as s } from './tv-styles';

/** Whether focus is on the seam guide now, rather than passing through. */
let guideHolding = false;

/** Focus reaching the seam guide between the rail and the content. */
const handleGuideFocus = (): void => {
    guideHolding = true;
    if (isTvSidewaysMove()) {
        // The person crossing: on to the other side, where they were there.
        if (getTvLastZone() !== 'rail') focusTvRail();
        // A page with nothing to focus yet hands it back to the rail item.
        else if (!enterTvScope(getTvContentScope())) enterTvScope('rail');
        return;
    }
    // Android parking focus because the control holding it went away. The
    // side it belongs on places it; never send it across.
    if (!shouldTvZoneTakeFocus('content')) {
        focusTvRail();
        return;
    }
    if (enterTvScope(getTvContentScope())) return;
    // A surface mounted in the same commit registers its controls a moment
    // after Android parks focus, so look again once they are in.
    requestAnimationFrame(() => {
        if (!guideHolding || enterTvScope(getTvContentScope())) return;
        // Nothing there (a detail still loading, or one that failed): show
        // focus on the rail's current page meanwhile. It still belongs to the
        // content, whose placement claims it when its control arrives.
        focusTvControl('rail', `rail:${selectTvPage(getAppNavigation())}`);
    });
};

const handleGuideBlur = (): void => {
    guideHolding = false;
};

export function TvApp() {
    const authReady = useAuthSessionSelector(
        (state) => state.bootResolved && !!state.serverConnection,
    );
    const page = useAppNavigationSelector(selectTvPage);
    const detailOpen = useAppNavigationSelector(
        (state) => state.mediaDetailState.status !== 'idle',
    );
    const viewAllOpen = useAppNavigationSelector(
        (state) => state.activeUtilityScreen === 'view-all',
    );
    const playerOpen = useAppNavigationSelector((state) => state.isFullPlayerOpen);
    const menuOpen = useMediaOverlaysSelector((state) => state.contextMenuTarget !== null);
    const sharedHome = useHomeDisplaySections();
    // Phone Home leaves stations to its Radio tab. TV needs the same raw
    // station catalog both in the Radio destination and Home's Radio filter.
    const home = useMemo(() => {
        const radio =
            sharedHome.homeContentState.status === 'loaded'
                ? sharedHome.homeContentState.content.sections.find(
                      (section) => section.id === MobileHomeSectionId.RADIO,
                  )
                : undefined;
        return radio?.items.length
            ? {
                  ...sharedHome,
                  sections: [
                      ...sharedHome.sections,
                      {
                          key: 'tv-radio-stations',
                          title: 'Stations',
                          items: radio.items,
                          variant: 'radio' as const,
                      },
                  ],
              }
            : sharedHome;
    }, [sharedHome]);
    const toast = useTvToast();
    const [radioPanel, setRadioPanel] = useState<TvRadioPanelSelection | null>(null);
    const [visited, setVisited] = useState<ReadonlySet<TvPage>>(new Set(['home']));
    // The seam guide's native tag: the gate both sides send sideways moves to.
    const [guideTag, setGuideTag] = useState<number | undefined>(undefined);
    const guideRef = useCallback((guide: View | null) => {
        setGuideTag(guide ? (findNodeHandle(guide) ?? undefined) : undefined);
    }, []);
    useSamoRadioPolling(authReady);
    useEffect(() => {
        installTvKeys();
        installTvScreenAwake();
    }, []);
    useEffect(() => {
        if (authReady) setOnboardingActive(false);
    }, [authReady]);
    useEffect(() => {
        setVisited((previous) => (previous.has(page) ? previous : new Set([page, ...previous])));
    }, [page]);
    useEffect(() => {
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            // Back is a press too (one the key bridge leaves to Android): an
            // arrow before it that moved nothing must not be read into the
            // focus Back is about to cause.
            noteTvKeyDown('back');
            if (!authReady) return false;
            if (radioPanel) {
                setTvPlacementZone('content');
                setRadioPanel(null);
                return true;
            }
            const nav = getAppNavigation();
            const action = getTvBackAction({
                detailOpen: nav.mediaDetailState.status !== 'idle',
                menuOpen: getMediaOverlays().contextMenuTarget !== null,
                page: selectTvPage(nav),
                playerOpen: nav.isFullPlayerOpen,
                viewAllOpen: nav.activeUtilityScreen === 'view-all',
                zone: getTvBackZone(),
            });
            if (action === 'close-menu') setContextMenuTarget(null);
            else if (action === 'close-player') closeTvPlayer();
            else if (action === 'pop-detail') {
                setTvPlacementZone('content');
                popMediaDetail();
            } else if (action === 'close-view-all') {
                setTvPlacementZone('content');
                closeViewAll();
            } else if (action === 'focus-rail') focusTvRail();
            else if (action === 'go-home') goTvHome();
            else return false;
            return true;
        });
        return () => subscription.remove();
    }, [authReady, radioPanel]);
    const covered = playerOpen || menuOpen || !!radioPanel;
    const baseActive = !covered && !detailOpen && !viewAllOpen;
    return (
        <TvRadioPanelContext.Provider value={setRadioPanel}>
            <View style={s.root}>
                {authReady ? (
                    <>
                        <View style={[s.fill, playerOpen && s.hidden]}>
                            <TvFocusZone covered={covered} gateLeft={guideTag} style={s.content}>
                                {[...new Set([page, ...visited])].map((destination) => {
                                    const active = baseActive && page === destination;
                                    return (
                                        <View
                                            key={destination}
                                            style={[
                                                s.page,
                                                (page !== destination ||
                                                    detailOpen ||
                                                    viewAllOpen) &&
                                                    s.hidden,
                                            ]}
                                        >
                                            {destination === 'home' ? (
                                                <TvHomePage active={active} home={home} />
                                            ) : destination === 'radio' ? (
                                                <TvRadio active={active} sections={home.sections} />
                                            ) : destination === 'search' ? (
                                                <TvSearch active={active} />
                                            ) : destination === 'settings' ? (
                                                <TvFocusScope
                                                    active={active}
                                                    defaultFocus="sign-out"
                                                    name="page:settings"
                                                >
                                                    <View style={s.pageScroll}>
                                                        <TvSettings run={runTvAction} />
                                                    </View>
                                                </TvFocusScope>
                                            ) : (
                                                <TvCollectionPage
                                                    active={active}
                                                    page={destination}
                                                />
                                            )}
                                        </View>
                                    );
                                })}
                                {viewAllOpen ? (
                                    <View style={[s.page, detailOpen && s.hidden]}>
                                        <TvViewAll active={!covered && !detailOpen} />
                                    </View>
                                ) : null}
                                {detailOpen ? (
                                    <View style={s.page}>
                                        <TvDetail active={!covered} />
                                    </View>
                                ) : null}
                            </TvFocusZone>
                            <TvFocusGuide
                                focusable={!covered}
                                onBlur={handleGuideBlur}
                                onFocus={handleGuideFocus}
                                ref={guideRef}
                                style={s.guide}
                            />
                            <TvRail active={!covered} gate={guideTag} />
                        </View>
                        {playerOpen ? <TvPlayer active={!menuOpen} /> : null}
                        {menuOpen ? <TvContextMenu /> : null}
                        {radioPanel ? (
                            <TvRadioPanel
                                selection={radioPanel}
                                onClose={() => {
                                    setTvPlacementZone('content');
                                    setRadioPanel(null);
                                }}
                            />
                        ) : null}
                    </>
                ) : (
                    <View style={s.setupFrame}>
                        <TvSetup run={runTvAction} />
                    </View>
                )}
                {toast ? (
                    <View style={s.toast}>
                        <Text accessibilityRole="alert" style={s.toastText}>
                            {toast.message}
                        </Text>
                    </View>
                ) : null}
            </View>
        </TvRadioPanelContext.Provider>
    );
}
