# Pre-Session Setup Guide

Complete these steps **before the session** so you arrive ready to go. Total time: about 10 minutes.

## 1. Open a Terminal

- **Mac:** Press `Cmd + Space`, type "Terminal", and hit Enter
- **Windows:** Press the Windows key, type "PowerShell", and hit Enter

You'll see a window with a blinking cursor. This is your terminal.

## 2. Check if Git is Installed

Paste this into your terminal and press Enter:

```
git --version
```

If you see a version number (e.g., `git version 2.39.0`), you're good. Move to step 3.

**If you see "command not found":**
- **Mac:** A dialog will pop up asking to install developer tools. Click "Install" and wait.
- **Windows:** Download Git from https://git-scm.com/downloads and run the installer. Use the default settings.

## 3. Check if Node.js is Installed

```
node --version
```

You need version 18 or higher. If you see `v18.x.x` or `v20.x.x` or higher, you're good.

**If you see "command not found" or a version below 18:**
- Download from https://nodejs.org/ — choose the LTS (Long Term Support) version
- Run the installer with default settings
- Close and reopen your terminal, then check `node --version` again

## 4. Check if Python 3 is Installed

```
python3 --version
```

You need version 3.9 or higher.

**If you see "command not found":**
- **Mac:** Python 3 comes pre-installed on recent macOS. If missing, install via https://www.python.org/downloads/
- **Windows:** Download from https://www.python.org/downloads/ — check "Add Python to PATH" during installation

## 5. Install Claude Code

```
npm install -g @anthropic-ai/claude-code
```

This installs Claude Code globally on your computer. It may take a minute.

## 6. Verify the Installation

```
claude --version
```

You should see a version number. If so, you're all set.

## 7. Authenticate Claude Code

```
claude
```

The first time you run Claude Code, it will ask you to log in. Follow the prompts to authenticate with your Anthropic account.

Once you see Claude's prompt, type `/exit` to close it. You're ready for the session.

## Quick Checklist

- [ ] Terminal opens without issues
- [ ] `git --version` returns a version number
- [ ] `node --version` returns v18 or higher
- [ ] `python3 --version` returns 3.9 or higher
- [ ] `claude --version` returns a version number
- [ ] `claude` opens and you can authenticate

## Need Help?

If you run into issues, email [support contact] with:
1. What step you're stuck on
2. The exact error message you see
3. Whether you're on Mac or Windows

We'll get you sorted before the session.
