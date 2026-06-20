const fs = require('fs');

function processFile(file, replacements) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    for (const repl of replacements) {
        content = content.replace(repl.pattern, repl.replacement);
    }
    fs.writeFileSync(file, content);
}

processFile('src/renderer/features/servers/components/edit-server-form.tsx', [
    { pattern: /[ \t]*if \(data\.ndCredential !== undefined\) \{\n[ \t]*serverItem\.ndCredential = data\.ndCredential;\n[ \t]*\}\n/g, replacement: '' }
]);

processFile('src/renderer/features/servers/components/add-server-form.tsx', [
    { pattern: /[ \t]*if \(data\.ndCredential !== undefined\) \{\n[ \t]*serverItem\.ndCredential = data\.ndCredential;\n[ \t]*\}\n/g, replacement: '' }
]);

processFile('src/renderer/features/login/routes/login-route.tsx', [
    { pattern: /[ \t]*if \(data\.ndCredential !== undefined\) \{\n[ \t]*updates\.ndCredential = data\.ndCredential;\n[ \t]*\}\n/g, replacement: '' },
    { pattern: /[ \t]*if \(data\.ndCredential !== undefined\) \{\n[ \t]*serverItem\.ndCredential = data\.ndCredential;\n[ \t]*\}\n/g, replacement: '' }
]);

processFile('src/renderer/hooks/use-server-authenticated.ts', [
    { pattern: /'credential' \| 'ndCredential' \| 'type' \| 'url'/g, replacement: "'credential' | 'type' | 'url'" },
    { pattern: /[ \t]*\.\.\.\(authData\.ndCredential !== undefined && \{\n[ \t]*ndCredential: authData\.ndCredential,\n[ \t]*\}\),\n/g, replacement: '' },
    { pattern: /[ \t]*serverWithAuth\.ndCredential,\n/g, replacement: '' }
]);

processFile('src/renderer/api/utils.ts', [
    { pattern: /[ \t]*actions\.updateServer\(serverId, \{ ndCredential: undefined \}\);\n/g, replacement: '' }
]);

processFile('src/shared/types/server.types.ts', [
    { pattern: /[ \t]*ndCredential\?: string;\n/g, replacement: '' }
]);
