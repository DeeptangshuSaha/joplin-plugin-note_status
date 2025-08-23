import joplin from 'api';
import { getStatusForNote, setStatusForNote, statusBadgeHtml, NoteStatus } from './statusManager';

joplin.plugins.register({
	onStart: async () => {

		// -----------------------------
		// Create status picker dialog
		// -----------------------------
		const dialogId = await joplin.views.dialogs.create('statusPicker');
		const updateDialogHtml = (current?: NoteStatus) => joplin.views.dialogs.setHtml(dialogId, `
            <form name="statusForm">
                <div style="font: 14px system-ui; min-width: 260px;">
                    <label for="statusSelect" style="display:block; margin-bottom:6px;">Select status</label>
                    <select name="statusSelect" id="statusSelect" style="width:100%; padding:6px;">
                        <option value="" ${!current ? 'selected' : ''}>None (clear)</option>
                        <option value="Active" ${current==='Active'?'selected':''}>Active 🔥</option>
                        <option value="Completed" ${current==='Completed'?'selected':''}>Completed ✅</option>
                        <option value="On Hold" ${current==='On Hold'?'selected':''}>On Hold ⏸️</option>
                        <option value="Dropped" ${current==='Dropped'?'selected':''}>Dropped ❌</option>
                    </select>
                </div>
            </form>
        `);

		await joplin.views.dialogs.setButtons(dialogId, [
			{ id: 'ok' }, { id: 'cancel' },
		]);

		// -----------------------------
		// Helper: set status + refresh badge
		// -----------------------------
		const setStatusAndRefresh = async (noteId: string, status: NoteStatus) => {
			await setStatusForNote(noteId, status);
			await refreshBadge();
		};

		const badgePanel = await joplin.views.panels.create('noteStatusToolbarBadge');

		const refreshBadge = async () => {
			const note = await joplin.workspace.selectedNote();
			const status = note ? await getStatusForNote(note.id) : null;
			await joplin.views.panels.setHtml(badgePanel, statusBadgeHtml(status));
		};

		// -----------------------------
		// Register the command first
		// -----------------------------
		await joplin.commands.register({
			name: 'openStatusPicker',
			label: 'Set Note Status',
			iconName: 'fas fa-clipboard', // static icon
			execute: async () => {
				const note = await joplin.workspace.selectedNote();
				if (!note) return;

				const current = await getStatusForNote(note.id);
				await updateDialogHtml(current);

				const result = await joplin.views.dialogs.open(dialogId);
				if (result.id !== 'ok') return;

				const formData = (result as any).formData
					?? await (joplin.views as any).dialogs.getFormData?.(dialogId);

				const chosen: NoteStatus = formData?.statusForm?.statusSelect || null;
				await setStatusAndRefresh(note.id, chosen);
			},
		});

		// -----------------------------
		// Create the toolbar button after command registration
		// -----------------------------
		await joplin.views.toolbarButtons.create(
			'noteStatusPickerBtn',
			'openStatusPicker',
			'editorToolbar'
		);

		// -----------------------------
		// Auto-refresh badge on note change
		// -----------------------------
		await joplin.workspace.onNoteSelectionChange(refreshBadge);
		await joplin.workspace.onNoteChange(async (event) => {
			const selected = await joplin.workspace.selectedNote();
			if (selected && selected.id === event.id) {
				await refreshBadge();
			}
		});

		// Initial render
		await refreshBadge();
	},
});
