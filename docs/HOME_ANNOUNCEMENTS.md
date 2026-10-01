# Home announcements

Android Home normally starts with personal shelves. The hero is a compact notice, with no reserved loading space and no generic recommendation fallback.

Candidates still come from `/home/heroes`. Android filters the ranking before fetching targets, so an ordinary recommendation cannot obscure an eligible event further down the response:

- `explore`: a drop with a `freshAt` timestamp within the last seven days.
- `episode`: a timestamp within three days, plus an episode actually published within three days. The show must be favorited, starred, or have at least three recorded plays. Episodes with recorded playback, progress, or completion are suppressed.
- `wrapped`: a server-provided readiness event within thirty days, targeting an existing supported item such as a playlist. This client change does not create Wrapped reports or add a server readiness endpoint.

Missing, invalid, future, and expired timestamps do not earn a banner. The server must advance an Explo event's `freshAt` when the drop changes, not on each request. Episode identity is its target ID, so changing its timestamp cannot reannounce it. Radio playback must be reflected in the server's per-user episode playback state for the unheard-episode check to account for it; the client has no separate radio history endpoint.

An update is recorded when the card mounts, not when it is fetched. Shown-event history is local to the device and scoped to server and listener (up to 256 events). It takes effect on the next foreground visit so the current card does not vanish on the next poll. A newer Explo drop can announce the same playlist again. Failed refreshes clear notices, and offline Home hides them.

Desktop retains the full recommendation card and the broader ranking. It refreshes the visit after thirty seconds away, or when the listener chooses **Another pick**. History is scoped to the account; ordinary minute-by-minute polls keep the same visit seed. The previous card stays visible while a replacement loads.
