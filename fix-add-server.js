const fs = require('fs');

let c = fs.readFileSync('src/renderer/features/servers/components/add-server-form.tsx', 'utf8');

// Remove SubsonicIcon import
c = c.replace(/import SubsonicIcon from '\/@\/renderer\/features\/servers\/assets\/opensubsonic\.png';\n/, '');

// Remove NAVIDROME and SUBSONIC from SERVER_TYPES
c = c.replace(/\[ServerType\.NAVIDROME\]: \{\n\s*icon: NavidromeIcon,\n\s*name: 'Navidrome',\n\s*\},\n\s*/, '');
c = c.replace(/\[ServerType\.SUBSONIC\]: \{\n\s*icon: SubsonicIcon,\n\s*name: 'OpenSubsonic',\n\s*\},\n\s*/, '');

// Fix initialServerType default
c = c.replace(/ServerType\.SUBSONIC;/, 'ServerType.SAMO;');

// Fix ndCredential assignments
c = c.replace(/if \(data\.ndCredential !== undefined\) \{\n\s*serverItem\.ndCredential = data\.ndCredential;\n\s*\}\n/g, '');

// Fix legacyAuth checkbox
c = c.replace(/\{form\.values\.type === ServerType\.SUBSONIC && \([\s\S]*?\}\)\}/, '');

fs.writeFileSync('src/renderer/features/servers/components/add-server-form.tsx', c);
