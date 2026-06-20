const { Project, SyntaxKind } = require('ts-morph');
const project = new Project({ tsConfigFilePath: '/Users/jake/Developer/samo/tsconfig.web.json' });

for (const file of project.getSourceFiles()) {
    let hasChanges = true;
    let limit = 100;
    while(hasChanges && limit > 0) {
        hasChanges = false;
        
        const ndNode = file.getDescendants().find(n => n.getKind() === SyntaxKind.Identifier && n.getText() === 'ndCredential');
        if (ndNode) {
            const propAssign = ndNode.getFirstAncestorByKind(SyntaxKind.PropertyAssignment);
            if (propAssign && propAssign.getName() === 'ndCredential') {
                propAssign.remove();
                hasChanges = true;
                continue;
            }
            const propSig = ndNode.getFirstAncestorByKind(SyntaxKind.PropertySignature);
            if (propSig && propSig.getName() === 'ndCredential') {
                propSig.remove();
                hasChanges = true;
                continue;
            }
            const propAccess = ndNode.getFirstAncestorByKind(SyntaxKind.PropertyAccessExpression);
            if (propAccess && propAccess.getName() === 'ndCredential') {
                const parent = propAccess.getParent();
                if (parent && parent.getKind() === SyntaxKind.BinaryExpression) {
                    const bin = parent;
                    if (bin.getOperatorToken().getKind() === SyntaxKind.EqualsEqualsEqualsToken || 
                        bin.getOperatorToken().getKind() === SyntaxKind.ExclamationEqualsEqualsToken) {
                        // ignore
                    } else if (bin.getOperatorToken().getKind() === SyntaxKind.EqualsToken) {
                        const stmt = bin.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
                        if (stmt) { stmt.remove(); hasChanges = true; continue; }
                    }
                }
            }
            
            const binExpr = ndNode.getFirstAncestorByKind(SyntaxKind.BinaryExpression);
            if (binExpr && binExpr.getOperatorToken().getKind() === SyntaxKind.AmpersandAmpersandToken) {
                binExpr.replaceWithText('false');
                hasChanges = true;
                continue;
            }
        }

        const serverTypeNodes = file.getDescendants().filter(n => 
            n.getKind() === SyntaxKind.PropertyAccessExpression && 
            (n.getText() === 'ServerType.NAVIDROME' || n.getText() === 'ServerType.SUBSONIC')
        );
        
        if (serverTypeNodes.length > 0) {
            const node = serverTypeNodes[0];
            const propAssign = node.getFirstAncestorByKind(SyntaxKind.PropertyAssignment);
            if (propAssign && propAssign.getNameNode() === node) {
                propAssign.remove();
                hasChanges = true;
                continue;
            }
            
            const caseClause = node.getFirstAncestorByKind(SyntaxKind.CaseClause);
            if (caseClause && caseClause.getExpression() === node) {
                caseClause.remove();
                hasChanges = true;
                continue;
            }
            
            const arrayLit = node.getFirstAncestorByKind(SyntaxKind.ArrayLiteralExpression);
            if (arrayLit) {
                const index = arrayLit.getElements().indexOf(node);
                if (index >= 0) {
                    arrayLit.removeElement(index);
                    hasChanges = true;
                    continue;
                }
            }
            
            const binExpr = node.getFirstAncestorByKind(SyntaxKind.BinaryExpression);
            if (binExpr) {
                const ifStmt = binExpr.getFirstAncestorByKind(SyntaxKind.IfStatement);
                if (ifStmt) {
                    if (ifStmt.getParent() && ifStmt.getParent().getKind() === SyntaxKind.IfStatement) {
                        const parentIf = ifStmt.getParent();
                        if (parentIf.getElseStatement() === ifStmt) {
                            // Instead of setElseStatement, replace the parent's else with this one's else
                            const elseStmt = ifStmt.getElseStatement();
                            if (elseStmt) {
                                ifStmt.replaceWithText(elseStmt.getText());
                            } else {
                                ifStmt.remove();
                            }
                        }
                    } else {
                        ifStmt.remove();
                    }
                    hasChanges = true;
                    continue;
                }
                
                binExpr.replaceWithText('false');
                hasChanges = true;
                continue;
            }
        }
        
        limit--;
    }
    
    // Auto-fix TS2339 and TS2561 and others
    let diagChanges = true;
    let diagLimit = 30;
    while(diagChanges && diagLimit > 0) {
        diagChanges = false;
        const diags = file.getPreEmitDiagnostics();
        const relevantDiags = diags.filter(d => [2339, 2561, 2305, 2307, 2724, 6133, 6192, 6196].includes(d.getCode()));
        relevantDiags.sort((a,b) => b.getStart() - a.getStart());
        for (const diag of relevantDiags) {
            const start = diag.getStart();
            if (!start) continue;
            const node = file.getDescendantAtPos(start);
            if (!node) continue;
            
            if (diag.getCode() === 6192) {
                const importDecl = node.getFirstAncestorByKind(SyntaxKind.ImportDeclaration);
                if (importDecl) {
                    importDecl.remove();
                    diagChanges = true;
                    break;
                }
            } else if (diag.getCode() === 6133 || diag.getCode() === 6196 || diag.getCode() === 2305 || diag.getCode() === 2307 || diag.getCode() === 2724) {
                const decl = node.getFirstAncestor(a => 
                    a.getKindName() === 'ImportSpecifier' ||
                    a.getKindName() === 'VariableDeclaration' ||
                    a.getKindName() === 'FunctionDeclaration'
                );
                if (decl) {
                    if (decl.getKindName() === 'ImportSpecifier') {
                        const importDecl = decl.getFirstAncestorByKind(SyntaxKind.ImportDeclaration);
                        decl.remove();
                        if (importDecl && importDecl.getNamedImports().length === 0) {
                            importDecl.remove();
                        }
                        diagChanges = true;
                        break;
                    } else if (decl.getKindName() === 'VariableDeclaration') {
                        const stmt = decl.getVariableStatement();
                        if (stmt) {
                            stmt.remove();
                            diagChanges = true;
                            break;
                        }
                    } else {
                        decl.remove();
                        diagChanges = true;
                        break;
                    }
                } else {
                    const importDecl = node.getFirstAncestorByKind(SyntaxKind.ImportDeclaration);
                    if (importDecl) {
                        importDecl.remove();
                        diagChanges = true;
                        break;
                    }
                }
            } else if (diag.getCode() === 2561) {
                const propAssign = node.getFirstAncestorByKind(SyntaxKind.PropertyAssignment);
                if (propAssign) {
                    propAssign.remove();
                    diagChanges = true;
                    break;
                }
            } else if (diag.getCode() === 2339) {
                const caseClause = node.getFirstAncestorByKind(SyntaxKind.CaseClause);
                if (caseClause) {
                    caseClause.remove();
                    diagChanges = true;
                    break;
                }
                const propAssign = node.getFirstAncestorByKind(SyntaxKind.PropertyAssignment);
                if (propAssign && propAssign.getNameNode() && propAssign.getNameNode().getText().includes('NAVIDROME')) {
                    propAssign.remove();
                    diagChanges = true;
                    break;
                }
                const arrayLit = node.getFirstAncestorByKind(SyntaxKind.ArrayLiteralExpression);
                if (arrayLit) {
                    const elements = arrayLit.getElements();
                    const el = node.getFirstAncestor(n => elements.includes(n));
                    if (el) {
                        arrayLit.removeElement(el);
                        diagChanges = true;
                        break;
                    }
                }
            }
        }
        diagLimit--;
    }
    
    file.saveSync();
}
