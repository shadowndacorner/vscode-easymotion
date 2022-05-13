// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import processCommand, { ActiveCommandContext, Configuration, SearchMode } from './command';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) 
{
    console.log('Easy motion initializing...');

    const unfocusedTextDecoration = vscode.window.createTextEditorDecorationType({
        color: '#777777',
        fontWeight: '0'
    });

    const textDecoration = vscode.window.createTextEditorDecorationType({
        opacity: '0'
    });

    let activePromise : Promise<void> | null = null;

    const vsConfigOptions = vscode.workspace.getConfiguration('vscode-easymotion');
    const config = new Configuration
    (
        unfocusedTextDecoration,
        textDecoration,
        vsConfigOptions.get<boolean>('allowJumpingToWordlessLines', true)
    );
    
    let commandContext : ActiveCommandContext | null = null;

    const startJump = async (editor: vscode.TextEditor, context: ActiveCommandContext)=>
    {
        if (activePromise) return;

        vscode.commands.executeCommand('setContext', 'vscodeEasyMotionJumping', true);
        activePromise = processCommand(editor, config, context);
        await activePromise;
        activePromise = null;
        commandContext = null;
        vscode.commands.executeCommand('setContext', 'vscodeEasyMotionJumping', false);
    };

    const switchSearchMode = (decrement: boolean)=>
    {
        if (commandContext)
        {
            commandContext.switchMode(decrement);
        }
    };

    const exitJump = ()=>
    {
        vscode.commands.executeCommand('setContext', 'vscodeEasyMotionJumping', false);
        if (commandContext)
        {
            commandContext.cancel();
        }

        activePromise = null;
        commandContext = null;
    };

    // Jump to Word Command
    context.subscriptions.push(vscode.commands.registerCommand('vscode-easymotion.jumpToWord', async () => 
    {
        const editor = vscode.window.activeTextEditor;
        if (editor)
        {
            commandContext = new ActiveCommandContext;
            await startJump(editor, commandContext);
        }
        else
        {
            vscode.window.showErrorMessage('You can only jump with an active text editor.');
        }
    }));

    // Jump to End of Word Command
    context.subscriptions.push(vscode.commands.registerCommand('vscode-easymotion.jumpToEndOfWord', async () => 
    {
        const editor = vscode.window.activeTextEditor;
        if (editor)
        {
            commandContext = new ActiveCommandContext;
            commandContext.searchMode = SearchMode.TokenEnd;
            await startJump(editor, commandContext);
        }
        else
        {
            vscode.window.showErrorMessage('You can only jump with an active text editor.');
        }
    }));

    // Cancel
    context.subscriptions.push(vscode.commands.registerCommand('vscode-easymotion.cancelJump', exitJump));

    context.subscriptions.push(vscode.commands.registerCommand('vscode-easymotion.incrementSearchMode', ()=>switchSearchMode(false)));
    context.subscriptions.push(vscode.commands.registerCommand('vscode-easymotion.decrementSearchMode', ()=>switchSearchMode(true)));

    // Backspace support (TODO: Is there a better way to detect this?)
    context.subscriptions.push(vscode.commands.registerCommand('vscode-easymotion.backspaceJumpMelody', ()=>
    {
        if (commandContext && commandContext.keyPromiseResolver)
        {
            if (commandContext.keyMelody.length === 0)
            {
                exitJump();
                return;
            }
            else
            {
                commandContext.keyPromiseResolver(-1);
                return;
            }
        }
    }));

    // Key listener
    context.subscriptions.push(vscode.commands.registerCommand('type', args => 
    {
        if (commandContext && commandContext.keyPromiseResolver) 
        {
            commandContext.keyPromiseResolver(args.text);
            return;
        }
        
        vscode.commands.executeCommand('default:type', args);
    }));
    
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(event => 
    {
        exitJump();
    }));
}

// this method is called when your extension is deactivated
export function deactivate() 
{}
