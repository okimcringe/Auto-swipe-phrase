// Auto Swipe on Phrase - SillyTavern extension
// If a new character message contains a banned word/phrase, automatically swipe for a new one.

const MODULE_NAME = 'auto_swipe_on_phrase';

const defaultSettings = Object.freeze({
    enabled: true,
    phrases: '',
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    maxRetries: 5,
    delayMs: 800,
    showToast: true,
});

let retryCount = 0;
let lastHandledKey = '';

function getSettings() {
    const { extensionSettings } = SillyTavern.getContext();
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
    }
    // Fill in any missing keys (for updates)
    for (const key of Object.keys(defaultSettings)) {
        if (!Object.hasOwn(extensionSettings[MODULE_NAME], key)) {
            extensionSettings[MODULE_NAME][key] = defaultSettings[key];
        }
    }
    return extensionSettings[MODULE_NAME];
}

function save() {
    SillyTavern.getContext().saveSettingsDebounced();
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Returns the first phrase found in text, or null. */
function findMatch(text, settings) {
    const lines = settings.phrases
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);

    const flags = settings.caseSensitive ? '' : 'i';

    for (const line of lines) {
        try {
            let pattern;
            if (settings.useRegex) {
                pattern = line;
            } else {
                pattern = escapeRegex(line);
                if (settings.wholeWord) {
                    pattern = `(?<![\\p{L}\\p{N}_])${pattern}(?![\\p{L}\\p{N}_])`;
                }
            }
            const re = new RegExp(pattern, flags + 'u');
            if (re.test(text)) return line;
        } catch (err) {
            console.warn(`[Auto Swipe] Invalid pattern "${line}":`, err);
        }
    }
    return null;
}

function toast(type, msg) {
    if (!getSettings().showToast) return;
    if (typeof toastr !== 'undefined') toastr[type](msg, 'Auto Swipe');
}

function triggerSwipe() {
    // Clicking the swipe-right button on the last message is the same thing
    // the user would do: it moves to the next swipe, or generates a new one
    // if already on the last swipe.
    const btn = $('#chat .mes.last_mes .swipe_right:visible').first();
    if (btn.length) {
        btn.trigger('click');
        return true;
    }
    return false;
}

function onMessageRendered(messageId) {
    const settings = getSettings();
    if (!settings.enabled) return;

    const context = SillyTavern.getContext();
    const chat = context.chat;
    if (!chat || !chat.length) return;

    const id = Number(messageId);
    // Only act on the newest message
    if (Number.isNaN(id) || id !== chat.length - 1) return;

    const message = chat[id];
    if (!message || message.is_user || message.is_system) return;

    // Avoid handling the same message state twice (MESSAGE_RECEIVED + RENDERED both fire)
    const key = `${id}:${message.swipe_id ?? 0}:${(message.mes || '').length}`;
    if (key === lastHandledKey) return;
    lastHandledKey = key;

    const hit = findMatch(message.mes || '', settings);

    if (!hit) {
        retryCount = 0;
        return;
    }

    if (retryCount >= Number(settings.maxRetries)) {
        toast('warning', `Max retries (${settings.maxRetries}) reached. Still contains "${hit}".`);
        retryCount = 0;
        return;
    }

    retryCount++;
    toast('info', `Found "${hit}" - swiping (${retryCount}/${settings.maxRetries})`);

    setTimeout(() => {
        if (!triggerSwipe()) {
            toast('error', 'Could not find the swipe button on the last message.');
            retryCount = 0;
        }
    }, Math.max(0, Number(settings.delayMs) || 0));
}

function resetState() {
    retryCount = 0;
    lastHandledKey = '';
}

function buildSettingsUI() {
    const s = getSettings();
    const html = `
    <div id="asp_settings" class="extension_container">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Auto Swipe on Phrase</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <label class="checkbox_label">
                    <input type="checkbox" id="asp_enabled" />
                    <span>Enabled</span>
                </label>

                <div class="asp_row"><b>Trigger words / phrases</b></div>
                <textarea id="asp_phrases" class="text_pole"
                    placeholder="One per line, e.g.&#10;shivers down her spine&#10;I cannot continue"></textarea>
                <div class="asp_hint">A reply containing any line triggers a swipe.</div>

                <label class="checkbox_label">
                    <input type="checkbox" id="asp_case" />
                    <span>Case sensitive</span>
                </label>
                <label class="checkbox_label">
                    <input type="checkbox" id="asp_whole" />
                    <span>Whole word only (ignored in regex mode)</span>
                </label>
                <label class="checkbox_label">
                    <input type="checkbox" id="asp_regex" />
                    <span>Treat each line as a regular expression</span>
                </label>
                <label class="checkbox_label">
                    <input type="checkbox" id="asp_toast" />
                    <span>Show notifications</span>
                </label>

                <div class="asp_row">
                    <label for="asp_max">Max retries in a row</label>
                    <input type="number" id="asp_max" class="text_pole" min="1" max="50" />
                </div>
                <div class="asp_row">
                    <label for="asp_delay">Delay before swipe (ms)</label>
                    <input type="number" id="asp_delay" class="text_pole" min="0" max="10000" step="100" />
                </div>
                <div class="asp_hint">Each retry uses API credits/time, so keep max retries sensible.</div>
            </div>
        </div>
    </div>`;

    $('#extensions_settings2').append(html);

    $('#asp_enabled').prop('checked', s.enabled).on('input', function () {
        s.enabled = !!$(this).prop('checked'); resetState(); save();
    });
    $('#asp_phrases').val(s.phrases).on('input', function () {
        s.phrases = String($(this).val()); save();
    });
    $('#asp_case').prop('checked', s.caseSensitive).on('input', function () {
        s.caseSensitive = !!$(this).prop('checked'); save();
    });
    $('#asp_whole').prop('checked', s.wholeWord).on('input', function () {
        s.wholeWord = !!$(this).prop('checked'); save();
    });
    $('#asp_regex').prop('checked', s.useRegex).on('input', function () {
        s.useRegex = !!$(this).prop('checked'); save();
    });
    $('#asp_toast').prop('checked', s.showToast).on('input', function () {
        s.showToast = !!$(this).prop('checked'); save();
    });
    $('#asp_max').val(s.maxRetries).on('input', function () {
        s.maxRetries = Math.max(1, Number($(this).val()) || 1); save();
    });
    $('#asp_delay').val(s.delayMs).on('input', function () {
        s.delayMs = Math.max(0, Number($(this).val()) || 0); save();
    });
}

jQuery(() => {
    const { eventSource, eventTypes } = SillyTavern.getContext();

    getSettings();
    buildSettingsUI();

    // Rendered event fires after the message is in the DOM, so the swipe button exists.
    eventSource.on(eventTypes.CHARACTER_MESSAGE_RENDERED, onMessageRendered);

    // A new user message or chat switch starts a fresh retry budget.
    eventSource.on(eventTypes.MESSAGE_SENT, resetState);
    eventSource.on(eventTypes.CHAT_CHANGED, resetState);

    console.log('[Auto Swipe on Phrase] loaded');
});
