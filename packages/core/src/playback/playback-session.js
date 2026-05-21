export var Play;
(function (Play) {
    Play["INDEX"] = "index";
    Play["LAST"] = "last";
    Play["LAST_SHUFFLE"] = "lastShuffle";
    Play["NEXT"] = "next";
    Play["NEXT_SHUFFLE"] = "nextShuffle";
    Play["NOW"] = "now";
    Play["SHUFFLE"] = "shuffle";
})(Play || (Play = {}));
export var PlayerQueueType;
(function (PlayerQueueType) {
    PlayerQueueType["DEFAULT"] = "default";
    PlayerQueueType["PRIORITY"] = "priority";
})(PlayerQueueType || (PlayerQueueType = {}));
export var PlayerRepeat;
(function (PlayerRepeat) {
    PlayerRepeat["ALL"] = "all";
    PlayerRepeat["NONE"] = "none";
    PlayerRepeat["ONE"] = "one";
})(PlayerRepeat || (PlayerRepeat = {}));
export var PlayerShuffle;
(function (PlayerShuffle) {
    PlayerShuffle["ALBUM"] = "album";
    PlayerShuffle["NONE"] = "none";
    PlayerShuffle["TRACK"] = "track";
})(PlayerShuffle || (PlayerShuffle = {}));
export var PlayerStatus;
(function (PlayerStatus) {
    PlayerStatus["PAUSED"] = "paused";
    PlayerStatus["PLAYING"] = "playing";
})(PlayerStatus || (PlayerStatus = {}));
export var PlayerType;
(function (PlayerType) {
    PlayerType["LOCAL"] = "local";
    PlayerType["WEB"] = "web";
})(PlayerType || (PlayerType = {}));
export const createIdlePlaybackSession = () => ({
    engine: 'none',
    id: 'idle',
    mediaKey: null,
    source: null,
    startedAt: 0,
    status: 'idle',
});
export const createPlaybackSession = ({ engine, mediaKey = null, now = Date.now(), sequence, source, }) => ({
    engine,
    id: `${source}-${now}-${sequence}`,
    mediaKey,
    source,
    startedAt: now,
    status: 'active',
});
