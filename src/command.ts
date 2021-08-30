import * as vscode from 'vscode';

class Position
{
    line = 0;
    offset = 0;
    combo = '';
}

function isCharWhitespace(c: number)
{
    // Space, carriage return, line feed, tab
    return c === 32 || c === 13 || c === 10 || c === 9;
}

function isCharNumber(c: number)
{
    return c >= 48 && c <= 57;
}

function isCharUpperAlpha(c: number)
{
    return c >= 65 && c <= 90;
}

function isCharLowerAlpha(c: number)
{
    return c >= 97 && c <= 122;
}

function isCharAlpha(c: number)
{
    return isCharUpperAlpha(c) || isCharLowerAlpha(c);
}

function isCharUnderscore(c: number)
{
    return c === 95;
}

function isValidIdentifierCharacter(c: number)
{
    return isCharAlpha(c) || isCharNumber(c) || isCharUnderscore(c);
}

function findCandidatePositions(editor: vscode.TextEditor, context: ActiveCommandContext)
{
    const positions : Position[] = [];
    for(const range of editor.visibleRanges)
    {
        for(let lineIndex = range.start.line; lineIndex < range.end.line; lineIndex++)
        {
            const line = editor.document.lineAt(lineIndex);
            
            let currentIdentifierStart : number | null = null;
            for(let i = line.firstNonWhitespaceCharacterIndex; i < line.text.length; ++i)
            {
                const c = line.text.charCodeAt(i);

                if (currentIdentifierStart === null)
                {
                    if (isCharWhitespace(c)) continue;
                    if (isValidIdentifierCharacter(c))
                    {
                        currentIdentifierStart = i;
                    }
                    // TODO: Should we have a separate, symbols-only mode?
                    /*
                    else 
                    {
                        const pos = new Position();
                        pos.line = lineIndex;
                        pos.offset = i;
                        positions.push(pos);
                    }*/
                }
                else if (!isValidIdentifierCharacter(c))
                {
                    const pos = new Position();
                    pos.line = lineIndex;
                    pos.offset = context.usingEndOfWord ? i : currentIdentifierStart;
                    
                    // Don't bother pushing the position if it's the same as the cursor
                    if (!(pos.line === editor.selection.start.line && pos.offset === editor.selection.start.character))
                    {
                        positions.push(pos);
                    }

                    currentIdentifierStart = null;
                }
            }

            if (currentIdentifierStart)
            {
                const pos = new Position();
                pos.line = lineIndex;
                pos.offset = currentIdentifierStart;
                
                // Don't bother pushing the position if it's the same as the cursor
                if (!(pos.line === editor.selection.start.line && pos.offset === editor.selection.start.character))
                {
                    positions.push(pos);
                }
                currentIdentifierStart = null;
            }
        }
    }

    const singleCharacterSet = 'fjrudkeislwoaqghty;p';
    const doubleCharacterSet = 'vncmx,z.bn';

    const selection = editor.selection;
    const sorted = positions.sort((a, b)=>
    {
        if (a.line === b.line)
        {
            const aDist = Math.abs(a.offset - selection.start.character);
            const bDist = Math.abs(b.offset - selection.start.character);
            if (aDist < bDist) return -1;
            if (bDist < aDist) return 1;
            return 0;
        }

        const aDist = Math.abs(a.line - selection.start.line);
        const bDist = Math.abs(b.line - selection.start.line);
        if (aDist < bDist) return -1;
        if (bDist < aDist) return 1;
        return 0;
    });

    let singleCharIndex = 0;
    let doubleCharIndex = -1;

    for(let i = 0; (i < positions.length) && (doubleCharIndex < doubleCharacterSet.length); ++i) 
    {
        let combo = '';
        if (doubleCharIndex >= 0)
        {
            combo += doubleCharacterSet.charAt(doubleCharIndex);
        }

        combo += singleCharacterSet.charAt(singleCharIndex);

        ++singleCharIndex;
        if (singleCharIndex >= singleCharacterSet.length)
        {
            singleCharIndex = 0;
            ++doubleCharIndex;
        }
        positions[i].combo = combo;
    }

    return positions;
}

function clearDecorations(config: Configuration, editor: vscode.TextEditor)
{
    editor.setDecorations(config.UnfocusedDecoration, []);
    editor.setDecorations(config.Decoration, []);
}

function decoratePositions(config: Configuration, context: ActiveCommandContext, editor: vscode.TextEditor, positions: Position[])
{
    const backgroundDecorations: vscode.DecorationOptions[] = [];

    backgroundDecorations.push
    (
        {
            range: new vscode.Range(0, 0, editor.document.lineCount - 1, editor.document.lineAt(editor.document.lineCount - 1).text.length)
        }
    );

    const decorationsArray: vscode.DecorationOptions[] = [];
    const colors = ['#ff5555', 'yellow', 'lime', 'magenta'];
    for(let i = 0; i < positions.length; i++)
    {
        const pos = positions[i];
        const valueToSub = 1 + (context.keyMelody.length);
        
        // TODO: Maybe toggle this with some configuration option?
        const textToDraw = pos.combo.substr(context.keyMelody.length, pos.combo.length - context.keyMelody.length);

        // const textToDraw = pos.combo;
        const tgColor = colors[(pos.combo.length - valueToSub) % colors.length];

        const styling = {
            border: '0 0 0 2px',
            borderColor: '#cccccc',
            fontWeight: 'bold',
            contentText: textToDraw,
            color: tgColor,
            width: '0px'
        };

        decorationsArray.push({ range: new vscode.Range(pos.line, pos.offset, pos.line, pos.offset + textToDraw.length),
            renderOptions:
            {
                dark: 
                {
                    before: styling
                },
                light: 
                {
                    before: styling
                }
            }
        });
    }
    
    editor.setDecorations(config.UnfocusedDecoration, backgroundDecorations);
    editor.setDecorations(config.Decoration, decorationsArray);
}

export class Configuration
{
    constructor(unfocused: vscode.TextEditorDecorationType, decoration: vscode.TextEditorDecorationType)
    {
        this.UnfocusedDecoration = unfocused;
        this.Decoration = decoration;
    }

    UnfocusedDecoration: vscode.TextEditorDecorationType;
    Decoration: vscode.TextEditorDecorationType;
}

export class ActiveCommandContext
{
    cancel() 
    {
        if (this.keyPromiseResolver)
        {
            this.keyPromiseResolver(null);
        }
    }
    
    usingEndOfWord = false;
    keyPromiseResolver: ((pressed: string | number | null)=>void) | null = null;
    keyMelody = '';
}


export default async function processCommand(editor: vscode.TextEditor, config: Configuration, context: ActiveCommandContext)
{
    if (editor)
    {
        const start = new Date();
        const positions = findCandidatePositions(editor, context);
        console.log(`${(new Date().getTime() - start.getTime()) / 1000} seconds to generate candidate positions, ${positions.length} found`);

        let filteredPositions = positions;
        
        do
        {
            // Decorate
            clearDecorations(config, editor);
            decoratePositions(config, context, editor, filteredPositions);

            // Get a key
            const key = await new Promise<string | number | null>((resolve, reject)=>
            {
                context.keyPromiseResolver = resolve;
            });

            if (key === null)
            {
                break;
            }

            let found = false;

            // If backspace...
            if (key === -1)
            {
                if (context.keyMelody.length > 0)
                {
                    found = true;
                    context.keyMelody = context.keyMelody.substring(0, context.keyMelody.length - 1);
                }
            }
            else
            {
                // Add key to melody
                context.keyMelody += key;

                for(const pos of filteredPositions)
                {
                    if (pos.combo.startsWith(context.keyMelody.toLowerCase()))
                    {
                        found = true;
                    }
                }
            }

            if (found)
            {
                if (context.keyMelody.length > 0)
                {
                    filteredPositions = positions.filter((v)=>v.combo.startsWith(context.keyMelody.toLowerCase()));
                }
                else
                {
                    filteredPositions = positions;
                }
            }
            else 
            {
                context.keyMelody = context.keyMelody.substring(0, context.keyMelody.length - 1);
            }
        } while(filteredPositions.length > 1);
        
        clearDecorations(config, editor);

        if (filteredPositions.length > 0)
        {
            const found = filteredPositions[0];

            let selection;
            if (isCharUpperAlpha(context.keyMelody.charCodeAt(context.keyMelody.length - 1)))
            {
                // TODO: Do we want fancier logic here?
                const startLine = editor.selection.start.line;
                const startChar = editor.selection.start.character;
                
                const endLine = found.line;
                const endChar = found.offset;

                selection = new vscode.Selection(startLine, startChar, endLine, endChar);
            }
            else
            {
                selection = new vscode.Selection(found.line, found.offset, found.line, found.offset);
            }

            editor.selection = selection;
        }
    }
    else 
    {
        // TODO: Warn that a text editor needs to be active
    }
}