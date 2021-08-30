// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import processCommand, { ActiveCommandContext, Configuration } from './command';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) 
{
    const unfocusedTextDecoration = vscode.window.createTextEditorDecorationType({
        color: '#777777',
        fontWeight: '0'
    });

    const textDecoration = vscode.window.createTextEditorDecorationType({
        opacity: '0'
    });

    let activePromise : Promise<void> | null = null;
    const config = new Configuration(unfocusedTextDecoration, textDecoration);
    
    let commandContext : ActiveCommandContext | null = null;

    // Command
    context.subscriptions.push(vscode.commands.registerCommand('vscode-easymotion.easyMotionJump', async () => 
    {
        const editor = vscode.window.activeTextEditor;
        if (editor)
        {
            if (activePromise) return;

            commandContext = new ActiveCommandContext;
            activePromise = processCommand(editor, config, commandContext);
            await activePromise;
            activePromise = null;
            commandContext = null;
        }
        else
        {
            vscode.window.showErrorMessage('You can only jump with an active text editor.');
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
        if (commandContext)
        {
            commandContext.cancel();
        }
        activePromise = null;
        commandContext = null;
    }));

    // TODO: Make a command that triggers the mode
    // TODO: Select the start of words
    // TODO: Decorate them
    // TODO: Darken the rest of the document
    // TODO: Jump the cursor when you type one of the things
    // TODO: 
}

// this method is called when your extension is deactivated
export function deactivate() 
{}
