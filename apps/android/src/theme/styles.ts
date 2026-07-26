import { downloadStyles } from './styles/downloads';
import { glyphStyles } from './styles/glyphs';
import { homeStyles } from './styles/home';
import { libraryStyles } from './styles/library';
import { mediaDetailStyles } from './styles/media-detail';
import { playerStyles } from './styles/player';
import { playlistStyles } from './styles/playlists';
import { radioStyles } from './styles/radio';
import { searchStyles } from './styles/search';
import { settingsStyles } from './styles/settings';
import { sharedStyles } from './styles/shared';
import { shellStyles } from './styles/shell';
import { viewAllStyles } from './styles/view-all';

/**
 * The app's style registry, composed from one module per surface domain
 * (./styles/*). Add new entries to the domain file that owns the surface;
 * keys are globally unique so every consumer keeps importing { styles }
 * from here.
 */
export const styles = {
    ...downloadStyles,
    ...glyphStyles,
    ...homeStyles,
    ...libraryStyles,
    ...mediaDetailStyles,
    ...playerStyles,
    ...playlistStyles,
    ...radioStyles,
    ...searchStyles,
    ...settingsStyles,
    ...sharedStyles,
    ...shellStyles,
    ...viewAllStyles,
};
