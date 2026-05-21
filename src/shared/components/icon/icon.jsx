import clsx from 'clsx';
import { motion } from 'motion/react';
import { forwardRef, memo, useMemo, } from 'react';
import { LuAlignCenter, LuAlignLeft, LuAlignRight, LuAppWindow, LuArrowDown, LuArrowDownToLine, LuArrowDownWideNarrow, LuArrowLeft, LuArrowLeftRight, LuArrowLeftToLine, LuArrowRight, LuArrowRightToLine, LuArrowUp, LuArrowUpDown, LuArrowUpNarrowWide, LuArrowUpToLine, LuBookOpen, LuBraces, LuCamera, LuCheck, LuChevronDown, LuChevronLast, LuChevronLeft, LuChevronRight, LuChevronUp, LuCircleCheck, LuCircleX, LuClipboardCopy, LuClock3, LuCloudDownload, LuCornerDownRight, LuCornerUpRight, LuDisc, LuDisc3, LuDownload, LuEllipsis, LuEllipsisVertical, LuExpand, LuExternalLink, LuFileJson, LuFlag, LuFolderOpen, LuGauge, LuGithub, LuGripHorizontal, LuGripVertical, LuHardDrive, LuHash, LuHeadphones, LuHeart, LuHeartCrack, LuHouse, LuImage, LuInfinity, LuInfo, LuKeyboard, LuLayoutGrid, LuLayoutList, LuLibrary, LuList, LuListFilter, LuListMinus, LuListMusic, LuListPlus, LuLoader, LuLock, LuLockOpen, LuLogIn, LuLogOut, LuMenu, LuMicVocal, LuMinus, LuMoon, LuMusic, LuMusic2, LuPackage2, LuPanelBottom, LuPanelRight, LuPanelRightClose, LuPanelRightOpen, LuPause, LuPencilLine, LuPin, LuPinOff, LuPlay, LuPlus, LuRadio, LuRotateCw, LuSave, LuSearch, LuSettings, LuSettings2, LuShare2, LuShieldAlert, LuShuffle, LuSkipBack, LuSkipForward, LuSlidersHorizontal, LuSquare, LuSquareCheck, LuStar, LuStepBack, LuStepForward, LuSun, LuTable, LuTimer, LuTimerOff, LuTrash, LuTriangleAlert, LuUpload, LuUser, LuUserPen, LuUserRoundCog, LuVolume1, LuVolume2, LuVolumeX, LuWifi, LuWifiOff, LuWrench, LuX, } from 'react-icons/lu';
import { MdOutlineVisibility, MdOutlineVisibilityOff } from 'react-icons/md';
import { PiMouseLeftClickFill, PiMouseRightClickFill } from 'react-icons/pi';
import { RiPlayListAddLine, RiRepeat2Line, RiRepeatOneLine } from 'react-icons/ri';
import styles from './icon.module.css';
import lastfmLogoIcon from './lastfm_logo_icon.png';
import listenbrainzLogoIcon from './listenbrainz_logo_icon.svg';
import musicbrainzLogoIcon from './musicbrainz_logo_icon.svg';
import qobuzLogoIcon from './qobuz_logo_icon.png';
import spotifyLogoIcon from './spotify_logo_icon.svg';
function logoImgStyle(size) {
    if (size === undefined)
        return undefined;
    const dim = typeof size === 'number' ? `${size}px` : size;
    return { height: dim, width: dim };
}
const ListenBrainzLogoIcon = forwardRef(({ className, size, style, ...props }, ref) => (<img alt="ListenBrainz" className={className} ref={ref} src={listenbrainzLogoIcon} style={logoImgStyle(size) ?? style} {...props}/>));
const SpotifyLogoIcon = forwardRef(({ className, size, style, ...props }, ref) => (<img alt="Spotify" className={className} ref={ref} src={spotifyLogoIcon} style={logoImgStyle(size) ?? style} {...props}/>));
const MusicBrainzLogoIcon = forwardRef(({ className, size, style, ...props }, ref) => (<img alt="MusicBrainz" className={className} ref={ref} src={musicbrainzLogoIcon} style={logoImgStyle(size) ?? style} {...props}/>));
const QobuzLogoIcon = forwardRef(({ className, size, style, ...props }, ref) => (<img alt="Qobuz" className={className} ref={ref} src={qobuzLogoIcon} style={logoImgStyle(size) ?? style} {...props}/>));
const LastfmLogoIcon = forwardRef(({ className, size, style, ...props }, ref) => (<img alt="Last.fm" className={className} ref={ref} src={lastfmLogoIcon} style={logoImgStyle(size) ?? style} {...props}/>));
export const AppIcon = {
    add: LuPlus,
    album: LuDisc3,
    alignCenter: LuAlignCenter,
    alignLeft: LuAlignLeft,
    alignRight: LuAlignRight,
    appWindow: LuAppWindow,
    arrowDown: LuArrowDown,
    arrowDownS: LuChevronDown,
    arrowDownToLine: LuArrowDownToLine,
    arrowLeft: LuArrowLeft,
    arrowLeftRight: LuArrowLeftRight,
    arrowLeftS: LuChevronLeft,
    arrowLeftToLine: LuArrowLeftToLine,
    arrowRight: LuArrowRight,
    arrowRightLast: LuChevronLast,
    arrowRightS: LuChevronRight,
    arrowRightToLine: LuArrowRightToLine,
    arrowUp: LuArrowUp,
    arrowUpS: LuChevronUp,
    arrowUpToLine: LuArrowUpToLine,
    artist: LuUserPen,
    brandGitHub: LuGithub,
    brandLastfm: LastfmLogoIcon,
    brandListenBrainz: ListenBrainzLogoIcon,
    brandMusicBrainz: MusicBrainzLogoIcon,
    brandQobuz: QobuzLogoIcon,
    brandSpotify: SpotifyLogoIcon,
    cache: LuCloudDownload,
    check: LuCheck,
    clipboardCopy: LuClipboardCopy,
    collection: LuPackage2,
    delete: LuTrash,
    disc: LuDisc,
    download: LuDownload,
    dragHorizontal: LuGripHorizontal,
    dragVertical: LuGripVertical,
    dropdown: LuChevronDown,
    duration: LuClock3,
    edit: LuPencilLine,
    ellipsisHorizontal: LuEllipsis,
    ellipsisVertical: LuEllipsisVertical,
    emptyAlbumImage: LuDisc3,
    emptyArtistImage: LuUser,
    emptyGenreImage: LuFlag,
    emptyImage: LuDisc3,
    emptyPlaylistImage: LuListMusic,
    emptySongImage: LuMusic,
    error: LuShieldAlert,
    expand: LuExpand,
    externalLink: LuExternalLink,
    favorite: LuHeart,
    fileJson: LuFileJson,
    filter: LuListFilter,
    folder: LuFolderOpen,
    genre: LuFlag,
    goToItem: LuCornerDownRight,
    hash: LuHash,
    home: LuHouse,
    image: LuImage,
    info: LuInfo,
    itemAlbum: LuDisc3,
    itemSong: LuMusic,
    json: LuBraces,
    keyboard: LuKeyboard,
    lastPlayed: LuHeadphones,
    layoutDetail: LuLayoutList,
    layoutGrid: LuLayoutGrid,
    layoutList: LuList,
    layoutPanelBottom: LuPanelBottom,
    layoutPanelRight: LuPanelRight,
    layoutTable: LuTable,
    library: LuLibrary,
    list: LuList,
    listInfinite: LuInfinity,
    listPaginated: LuArrowRightToLine,
    lock: LuLock,
    lockOpen: LuLockOpen,
    mediaNext: LuSkipForward,
    mediaPause: LuPause,
    mediaPlay: LuPlay,
    mediaPlayLast: LuChevronLast,
    mediaPlayNext: LuCornerUpRight,
    mediaPrevious: LuSkipBack,
    mediaRandom: RiPlayListAddLine,
    mediaRepeat: RiRepeat2Line,
    mediaRepeatOne: RiRepeatOneLine,
    mediaSettings: LuSlidersHorizontal,
    mediaShuffle: LuShuffle,
    mediaSpeed: LuGauge,
    mediaStepBackward: LuStepBack,
    mediaStepForward: LuStepForward,
    mediaStop: LuSquare,
    menu: LuMenu,
    metadata: LuBookOpen,
    microphone: LuMicVocal,
    minus: LuMinus,
    mouseLeftClick: PiMouseLeftClickFill,
    mouseRightClick: PiMouseRightClickFill,
    panelRightClose: LuPanelRightClose,
    panelRightOpen: LuPanelRightOpen,
    pin: LuPin,
    playlist: LuListMusic,
    playlistAdd: LuListPlus,
    playlistDelete: LuListMinus,
    plus: LuPlus,
    queryBuilder: LuWrench,
    queue: LuList,
    radio: LuRadio,
    refresh: LuRotateCw,
    remove: LuMinus,
    save: LuSave,
    search: LuSearch,
    server: LuHardDrive,
    settings: LuSettings2,
    settings2: LuSettings,
    share: LuShare2,
    signIn: LuLogIn,
    signOut: LuLogOut,
    sleepTimer: LuTimer,
    sleepTimerOff: LuTimerOff,
    sort: LuArrowUpDown,
    sortAsc: LuArrowUpNarrowWide,
    sortDesc: LuArrowDownWideNarrow,
    spinner: LuLoader,
    square: LuSquare,
    squareCheck: LuSquareCheck,
    star: LuStar,
    success: LuCircleCheck,
    themeDark: LuMoon,
    themeLight: LuSun,
    track: LuMusic2,
    unfavorite: LuHeartCrack,
    unpin: LuPinOff,
    upload: LuUpload,
    uploadImage: LuCamera,
    user: LuUser,
    userManage: LuUserRoundCog,
    visibility: MdOutlineVisibility,
    visibilityOff: MdOutlineVisibilityOff,
    volumeMax: LuVolume2,
    volumeMute: LuVolumeX,
    volumeNormal: LuVolume1,
    warn: LuTriangleAlert,
    wifiOff: LuWifiOff,
    wifiOn: LuWifi,
    x: LuX,
    xCircle: LuCircleX,
};
const _Icon = forwardRef((props, ref) => {
    const { animate, className, color, fill, icon, size = 'md' } = props;
    const IconComponent = AppIcon[icon];
    const classNames = useMemo(() => clsx(className, {
        [styles.fill]: true,
        [styles.pulse]: animate === 'pulse',
        [styles.spin]: animate === 'spin',
        [styles[`color-${color || fill}`]]: color || fill,
        [styles[`fill-${fill}`]]: fill,
        [styles[`size-${size}`]]: true,
    }), [animate, className, color, fill, size]);
    return (<IconComponent className={classNames} fill={fill} ref={ref} size={isPredefinedSize(size) ? undefined : size}/>);
});
_Icon.displayName = 'Icon';
export const Icon = memo(_Icon);
Icon.displayName = 'Icon';
export const MotionIcon = motion.create(Icon);
function isPredefinedSize(size) {
    return (size === '2xl' ||
        size === '3xl' ||
        size === '4xl' ||
        size === '5xl' ||
        size === 'lg' ||
        size === 'md' ||
        size === 'sm' ||
        size === 'xl' ||
        size === 'xs');
}
