import * as vscode from 'vscode';

export enum SearchMode
{
    TokenStart,
    TokenEnd,
    InnerWords,
    All,
    Count
}

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

function isWordChangeBetweenCharacters(c1: number, c2: number)
{
    return (isCharAlpha(c1) !== isCharAlpha(c2))
        || (isCharNumber(c1) !== isCharNumber(c2))
        || (isCharLowerAlpha(c1) && isCharUpperAlpha(c2))
    ;
    // return isCharAlpha(c) || isCharNumber(c) || isCharUnderscore(c);
}

function findCandidatePositions(editor: vscode.TextEditor, context: ActiveCommandContext, config: Configuration)
{
    const start = new Date();
    const positions : Position[] = [];
    try
    {
        for(const range of editor.visibleRanges)
        {
            for(let lineIndex = range.start.line; lineIndex <= range.end.line; lineIndex++)
            {
                const line = editor.document.lineAt(lineIndex);

                let didFindAnyWords = false;
                let tokenStart : number | null = null;
                for(let lineCursor = line.firstNonWhitespaceCharacterIndex; lineCursor <= line.text.length; ++lineCursor)
                {
                    const c = lineCursor === line.text.length ? '\n'.charCodeAt(0) : line.text.charCodeAt(lineCursor);
                
                    if (tokenStart === null)
                    {
                        if (isCharWhitespace(c)) continue;
                        if (isValidIdentifierCharacter(c))
                        {
                            didFindAnyWords = true;
                            tokenStart = lineCursor;
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
                        switch(context.searchMode)
                        {
                        case SearchMode.TokenStart:
                        case SearchMode.TokenEnd:
                        {
                            const pos = new Position();
                            pos.line = lineIndex;
                            pos.offset = context.searchMode === SearchMode.TokenEnd ? lineCursor : tokenStart;
                        
                            // Don't bother pushing the position if it's the same as the cursor
                            if (!(pos.line === editor.selection.start.line && pos.offset === editor.selection.start.character))
                            {
                                positions.push(pos);
                            }
                            break;
                        }
                        case SearchMode.InnerWords:
                        case SearchMode.All:
                        // case SearchMode.WordEnd:
                        {
                            console.log(`searching for words in token \`${line.text.substring(tokenStart, lineCursor)}\``);
                            let tempPositions: Position[] = [];
                            if (context.searchMode === SearchMode.All)
                            {
                                {
                                    const pos = new Position();
                                    pos.line = lineIndex;
                                    pos.offset = tokenStart;
                        
                                    // Don't bother pushing the position if it's the same as the cursor
                                    if (!(pos.line === editor.selection.start.line && pos.offset === editor.selection.start.character))
                                    {
                                        tempPositions.push(pos);
                                    }
                                }
                                {
                                    const pos = new Position();
                                    pos.line = lineIndex;
                                    pos.offset = lineCursor;
                            
                                    // Don't bother pushing the position if it's the same as the cursor
                                    if (!(pos.line === editor.selection.start.line && pos.offset === editor.selection.start.character))
                                    {
                                        positions.push(pos);
                                    }
                                }
                            }
                        
                            // Detect word start/end positions in the token
                            let wordStart = tokenStart;
                            let prevWordChar = line.text.charCodeAt(wordStart);
                            for(let tokenCursor = tokenStart + 1; tokenCursor < lineCursor; ++tokenCursor)
                            {
                                const wordChar = line.text.charCodeAt(tokenCursor);
                                if (isWordChangeBetweenCharacters(prevWordChar, wordChar))
                                {
                                    const pos = new Position();
                                    pos.line = lineIndex;
                                    // pos.offset = context.searchMode === SearchMode.WordEnd ? tokenCursor : wordStart;
                                    pos.offset = tokenCursor;
                                
                                    // console.log(`${pos.offset} change detected at offset ${tokenCursor - tokenStart} (${prevWordChar} -> ${wordChar}), emitting @ ${wordStart}`);
                                    tempPositions.push(pos);
                                    wordStart = tokenCursor;
                                }
                                prevWordChar = wordChar;
                            }

                            for(let i = 0; i < tempPositions.length; ++i)
                            {
                                const pos = tempPositions[i];
                                // Don't bother pushing the position if it's the same as the cursor
                                // if (!(pos.line === editor.selection.start.line && pos.offset === editor.selection.start.character))
                                {
                                    positions.push(pos);
                                }
                            }
                            break;
                        }
                        }

                        tokenStart = null;
                    }
                }

                if (tokenStart)
                {
                    const pos = new Position();
                    pos.line = lineIndex;
                    pos.offset = tokenStart;
                
                    // Don't bother pushing the position if it's the same as the cursor
                    if (!(pos.line === editor.selection.start.line && pos.offset === editor.selection.start.character))
                    {
                        positions.push(pos);
                    }
                    tokenStart = null;
                }

                // If there were no words in the line and the line is non-empty, then add it as a jump position
                if (!didFindAnyWords && config.AllowJumpingToWordlessLine)
                {
                    const pos = new Position();
                    pos.line = lineIndex;
                    pos.offset = line.text.length;
                    
                    // Don't bother pushing the position if it's the same as the cursor
                    if (!(pos.line === editor.selection.start.line && pos.offset === editor.selection.start.character))
                    {
                        positions.push(pos);
                    }
                }
            }
        }

        // Tuned these keys by hands based on an American English keyboard.
        // This is a good candidate for configuration so that we can better
        // support other keyboard layouts.
        const singleCharacterSet = 'fjrudkeislwoaqghtyp';
        const doubleCharacterSet = 'vncmxzb,;\'[*+-';

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
    finally
    {
        console.log(`${(new Date().getTime() - start.getTime()) / 1000} seconds to generate candidate positions, ${positions.length} found`);
    }
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

    if (context.isEnteringFilter) return;

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
    constructor(unfocused: vscode.TextEditorDecorationType, decoration: vscode.TextEditorDecorationType, allowJumpToWordlessLine: boolean)
    {
        this.UnfocusedDecoration = unfocused;
        this.Decoration = decoration;
        this.AllowJumpingToWordlessLine = allowJumpToWordlessLine;
    }

    UnfocusedDecoration: vscode.TextEditorDecorationType;
    Decoration: vscode.TextEditorDecorationType;
    AllowJumpingToWordlessLine: boolean;
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

    switchMode(decrement: boolean)
    {
        if (this.keyPromiseResolver)
        {
            if (decrement)
            {
                this.keyPromiseResolver('DECRMODE');
                
            }
            else
            {
                this.keyPromiseResolver('INCRMODE');
            }
        }
    }
    
    isEnteringFilter = false;
    
    // NOTE: This has been added back to singleCharacterSet.  When implementing filters, do not forget to remove this from singleCharacterSet.
    // Making this comment ridiculous so I don't miss it later. // filterToggleKey = 'f';

    filter = '';
    searchMode = SearchMode.TokenStart;
    keyPromiseResolver: ((pressed: string | number | null)=>void) | null = null;
    keyMelody = '';
}


export default async function processCommand(editor: vscode.TextEditor, config: Configuration, context: ActiveCommandContext)
{
    try
    {
        if (editor)
        {
            let positions = findCandidatePositions(editor, context, config);
            let filteredPositions = positions;
        
            do
            {
                // Decorate
                clearDecorations(config, editor);
                decoratePositions(config, context, editor, filteredPositions);

                // Get a key
                const key = await new Promise<string | number | null>((resolve)=>
                {
                    context.keyPromiseResolver = resolve;
                });

                if (key === null)
                {
                    filteredPositions = [];
                    break;
                }

                let found = false;

                // If backspace...
                if (key === -1)
                {
                    // If we're inputting the filter, backspace
                    if (context.isEnteringFilter)
                    {
                        if (context.filter.length === 0)
                        {
                            context.isEnteringFilter = false;
                        }
                        else
                        {
                            context.filter = context.filter.substring(0, context.filter.length - 1);
                        }
                    }
                    else
                    {
                        if (context.keyMelody.length > 0)
                        {
                            found = true;
                            context.keyMelody = context.keyMelody.substring(0, context.keyMelody.length - 1);
                        }
                    }
                }
                else
                {
                    if (key === 'INCRMODE')
                    {
                        // Switch modes on tab pressed
                        context.searchMode = (context.searchMode + 1) % SearchMode.Count;
                        positions = findCandidatePositions(editor, context, config);
                    }
                    else if (key === 'DECRMODE')
                    {
                        context.searchMode = context.searchMode - 1;
                        if (context.searchMode < 0)
                        {
                            context.searchMode = SearchMode.Count - 1;
                        }
                        positions = findCandidatePositions(editor, context, config);
                    }
                    else if (typeof key === 'string' && isCharNumber(key.charCodeAt(0)))
                    {
                        // Use 1-N for mode switching
                        const num = key.charCodeAt(0) - 48 - 1;
                        // console.log(`Number pressed - found ${num}, max == ${SearchMode.Count}`);
                        if (num >= 0 && num < SearchMode.Count)
                        {
                            context.searchMode = num;
                            if (context.searchMode < 0)
                            {
                                context.searchMode = SearchMode.Count - 1;
                            }
                            positions = findCandidatePositions(editor, context, config);
                        }
                    }
                    else
                    {
                        context.keyMelody += key;
                    }

                    // if (key === context.filterToggleKey)
                    // {
                    //     context.isEnteringFilter = true;
                    // }
                    // else
                    // {
                    // Add key to melody

                    for(const pos of filteredPositions)
                    {
                        if (pos.combo.startsWith(context.keyMelody.toLowerCase()))
                        {
                            found = true;
                        }
                    }
                    // }
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
        
            if (filteredPositions.length === 1)
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
    catch(err)
    {
        console.error(err);
    }
    finally
    {
        clearDecorations(config, editor);
    }
}