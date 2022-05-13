# EasyMotion for Visual Studio Code

This extension implements a simplified version of the [EasyMotion plugin for Vim](https://github.com/easymotion/vim-easymotion) for VS Code.  It supports jumping to the start and end of words based on the provided commands, as well as jumping to lines without words.

## Usage

This extension provides the default key bindings `alt+/` for jumping to a word and `alt+shift+/` for jumping to the end of a word (as well as the ability to switch between search modes mid-serach - see the Search Modes section for detail).  When jumping, simply use the highlighted keys to jump to the desired position.

By default, `escape` exits jump mode without changing the cursor position/selection.

While in jump mode, pressing backspace will undo the last character entered for the jump (eg if you want to jump to `vf` but instead type `b`, pressing backspace reveals the `v` characters again).  If no characters have been entered, then it behaves in the same way as `escape`.

## Search Modes

There are currently four search modes - searching for token starts, token ends, "inner words", and searching for all possible jump points.  You can switch between the different modes with 1-4, or by using tab/shift+tab (by default) to iterate through them.

## Commands

|Command|Default Keybinding|
|-|-|
|`vscode-easymotion.jumpToWord`|`alt+/`|
|`vscode-easymotion.jumpToEndOfWord`|`alt+shift+/`|
|`vscode-easymotion.backspaceJumpMelody`|`backspace`|
|`vscode-easymotion.cancelJump`|`escape`|
|`vscode-easymotion.incrementSearchMode`|`tab`|
|`vscode-easymotion.decrementSearchMode`|`shift+tab`|

To change key bindings, simply reassign them in the Visual Studio Code Keybindings configuration (either by editing the JSON directly or in the UI).

## Configuration Options

Aside from the configurable keybindings, this extension exposes the following configuration options...

|Option|Default Value|Description|
|-|-|-|
|vscode-easymotion.allowJumpingToWordlessLines|true|When enabled, lines that do not contain any words will include a jump point at the end of the line