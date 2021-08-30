# EasyMotion for Visual Studio Code

This extension implements a simplified version of the [EasyMotion plugin for Vim](https://github.com/easymotion/vim-easymotion) for VS Code.  It supports jumping to the start and end of words based on the provided commands.

## Usage

This extension provides the default key bindings `alt+/` for jumping to a word and `alt+shift+/` for jumping to the end of a word.  When jumping, simply use the highlighted keys to jump to the desired position.  Holding shift while pressing the last character in the sequence will highlight to that position instead of moving the cursor.

By default, `escape` exits jump mode without changing the cursor position/selection.

While in jump mode, pressing backspace will undo the last character entered for the jump (eg if you want to jump to `vf` but instead type `b`, pressing backspace reveals the `v` characters again).  If no characters have been entered, thene it behaves in the same way as `escape`.

## Commands

|Command|Default Keybinding|
|-|-|
|`vscode-easymotion.jumpToWord`|`alt+/`|
|`vscode-easymotion.jumpToEndOfWord`|`alt+shift+/`|
|`vscode-easymotion.backspaceJumpMelody`|`backspace`|
|`vscode-easymotion.cancelJump`|`escape`|

To change key bindings, simply reassign them in the Visual Studio Code Keybindings configuration (either by editing the JSON directly or in the UI).

## Configuration Options

Aside from the configurable keybindings, this extension currenetly does not provide any configuration options.  Open an issue on GitHub to suggest anything that you would like to be configurable.