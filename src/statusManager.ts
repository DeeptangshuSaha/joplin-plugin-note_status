import joplin from 'api';

export type NoteStatus = 'Active' | 'Completed' | 'On Hold' | 'Dropped' | null;

const STATUS_KEY = 'noteStatus';

export async function setStatusForNote(noteId: string, status: NoteStatus) {
    if (!noteId) return;
    const note = await joplin.data.get(['notes', noteId], { fields: ['user_data'] });
    if (!note) return;

    let userData: Record<string, any> = {};
    try { userData = note.user_data ? JSON.parse(note.user_data) : {}; }
    catch {}

    if (status === null) delete userData[STATUS_KEY];
    else userData[STATUS_KEY] = status;

    await joplin.data.put(['notes', noteId], null, { user_data: JSON.stringify(userData) });
}

export async function getStatusForNote(noteId: string): Promise<NoteStatus> {
    if (!noteId) return null;
    const note = await joplin.data.get(['notes', noteId], { fields: ['user_data'] });
    if (!note || !note.user_data) return null;

    try {
        const userData = JSON.parse(note.user_data);
        return (userData[STATUS_KEY] as NoteStatus) ?? null;
    } catch { return null; }
}

export function statusBadgeHtml(status: NoteStatus): string {
    const colorMap: Record<string, string> = {
        'Active': '#3b82f6',
        'Completed': '#10b981',
        'On Hold': '#f59e0b',
        'Dropped': '#ef4444',
    };
    const emojiMap: Record<string, string> = {
        'Active': '🔥',
        'Completed': '✅',
        'On Hold': '⏸️',
        'Dropped': '❌',
    };

    const text = status ?? 'None';
    const bg = status ? colorMap[status] : '#6b7280';
    const emoji = status ? emojiMap[status] : '';

    return `
        <style>
            #noteStatusToolbarBadge .panel-title { display: none !important; }

            .note-status-toolbar-badge {
                font: 400 14px/1.2 system-ui;
                color: #fff;
                background: ${bg};
                padding: 6px 12px;
                border-radius: 8px;
                display: inline-block;
                box-shadow: 0 0 4px rgba(0,0,0,0.3);
            }

            #noteStatusToolbarBadge {
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 6px;
            }
        </style>

        <div class="note-status-toolbar-badge">${emoji} ${text}</div>
    `;
}
