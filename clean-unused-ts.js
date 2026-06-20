const { Project } = require('ts-morph');
const project = new Project({ tsConfigFilePath: '/Users/jake/Developer/samo/packages/core/tsconfig.json' });

const mmd = project.getSourceFile('mobile-media-detail.ts');
if (mmd) {
    const diags = mmd.getPreEmitDiagnostics().filter(d => [6192, 6133].includes(d.getCode()));
    diags.sort((a,b) => b.getStart() - a.getStart());
    for (const diag of diags) {
        const start = diag.getStart();
        if (start) {
            const node = mmd.getDescendantAtPos(start);
            if (node) {
                if (diag.getCode() === 6192) {
                    const importDecl = node.getFirstAncestorByKind(269);
                    if (importDecl) importDecl.remove();
                } else if (diag.getCode() === 6133) {
                    const importSpec = node.getFirstAncestorByKind(273);
                    if (importSpec) {
                        const importDecl = importSpec.getFirstAncestorByKind(269);
                        importSpec.remove();
                        if (importDecl && importDecl.getNamedImports().length === 0) importDecl.remove();
                    }
                }
            }
        }
    }
    mmd.saveSync();
}

const pbtest = project.getSourceFile('mobile-playback.test.ts');
if (pbtest) {
    const auth = pbtest.getVariableDeclaration('authentication');
    if (auth) auth.getVariableStatement().remove();
    const tsAuth = pbtest.getImportDeclaration(d => d.getModuleSpecifierValue() === '../test-fixtures');
    if (tsAuth) tsAuth.remove();
    pbtest.saveSync();
}

const pb = project.getSourceFile('mobile-playback.ts');
if (pb) {
    const resolveRadioPlaybackDisplay = pb.getVariableDeclaration('resolveRadioPlaybackDisplay');
    if (resolveRadioPlaybackDisplay) resolveRadioPlaybackDisplay.getVariableStatement().remove();
    pb.saveSync();
}

const mpe = project.getSourceFile('mobile-playlist-edit.ts');
if (mpe) {
    const requestJson = mpe.getImportDeclaration(d => d.getModuleSpecifierValue() === '../server/server-http')?.getNamedImports().find(n => n.getName() === 'requestJson');
    if (requestJson) requestJson.remove();
    mpe.saveSync();
}

const ms = project.getSourceFile('mobile-search.ts');
if (ms) {
    const annSub = ms.getImportDeclaration(d => d.getModuleSpecifierValue() === './mobile-subsonic-quality');
    if (annSub) annSub.remove();
    
    const parseIso = ms.getImportDeclaration(d => d.getModuleSpecifierValue() === '../utils/date');
    if (parseIso) parseIso.remove();
    ms.saveSync();
}
