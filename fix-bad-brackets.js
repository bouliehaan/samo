const fs = require('fs');

function fixBrackets(file) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    // We basically need to remove dangling array items.
    // They look like:
    //    ],
    //    {
    //        defaultOrder: SortOrder.DESC,
    //        name: i18n.t('filter.albumCount', { postProcess: 'titleCase' }),
    //        value: AlbumArtistListSort.ALBUM_COUNT,
    //    },
    //    ...
    //    ],
    // We can just use a regex to strip them out.
    // They always appear right after a `],` and end with `],`
    
    // Let's just fix it by replacing the dangling blocks.
    content = content.replace(/],\s*\{\s*defaultOrder:[\s\S]*?\}\s*,\s*\]/g, ']');
    content = content.replace(/],\s*\{\s*defaultOrder:[\s\S]*?\}\s*,\s*\]/g, ']'); // run again for overlaps
    
    // wait, what if they don't end with `],` but with `};`?
    content = content.replace(/],\s*\{\s*defaultOrder:[\s\S]*?\}\s*,\s*\}\s*;/g, '}');

    // what if they end with `] as const;`?
    content = content.replace(/],\s*\{\s*defaultOrder:[\s\S]*?\}\s*,\s*\] as const;/g, '] as const;');
    
    fs.writeFileSync(file, content);
}

fixBrackets('src/renderer/features/shared/components/list-sort-by-dropdown.tsx');
