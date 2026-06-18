const fs = require('fs');
const source = fs.readFileSync('/Users/jake/Developer/samo/node_modules/@shopify/flash-list/dist/FlashListProps.d.ts', 'utf8');
if (source.includes('estimatedItemSize')) {
    console.log('estimatedItemSize exists');
} else {
    console.log('estimatedItemSize does NOT exist');
}
