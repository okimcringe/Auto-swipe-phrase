# Auto Swipe on Phrase

A SillyTavern extension that automatically swipes when a character's reply contains a word or phrase you've listed.

## Install

**Option A: Git URL**
Push this folder to a GitHub repo, then in SillyTavern open Extensions (puzzle icon), click "Install extension", and paste the repo URL.

**Option B: Manual**
Copy the `auto-swipe-phrase` folder to one of:
- `SillyTavern/data/<your-user>/extensions/` (recommended, 1.12.6+)
- `SillyTavern/public/scripts/extensions/third-party/`

Then restart SillyTavern (or refresh the page).

## Use

Open Extensions, find "Auto Swipe on Phrase", and add one word or phrase per line.

Options:
- Case sensitive
- Whole word only
- Regex mode (each line is a regular expression)
- Max retries in a row (prevents endless loops)
- Delay before swiping
- Notifications on/off

The retry counter resets when a reply passes, when you send a message, or when you change chats.

## Notes

- Only the newest character message is checked; user and system messages are ignored.
- It works by clicking the swipe-right button on the last message, so if you're on an older swipe it will advance to the next one before generating a new one.
- Requires a recent SillyTavern version with `SillyTavern.getContext()`.
