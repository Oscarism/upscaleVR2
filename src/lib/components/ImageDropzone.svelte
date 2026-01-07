<script lang="ts">
	interface Props {
		onImageSelected: (file: File, previewUrl: string) => void;
		disabled?: boolean;
	}

	let { onImageSelected, disabled = false }: Props = $props();

	let isDragging = $state(false);
	let fileInput: HTMLInputElement;

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (!disabled) isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (disabled) return;

		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			processFile(files[0]);
		}
	}

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			processFile(target.files[0]);
		}
	}

	function processFile(file: File) {
		if (!file.type.startsWith('image/')) {
			alert('Please select an image file');
			return;
		}

		const previewUrl = URL.createObjectURL(file);
		onImageSelected(file, previewUrl);
	}

	function handleClick() {
		if (!disabled) fileInput.click();
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleClick();
		}
	}
</script>

<div
	class="dropzone"
	class:dragging={isDragging}
	class:disabled
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	onclick={handleClick}
	onkeydown={handleKeyDown}
	role="button"
	tabindex={disabled ? -1 : 0}
	aria-label="Drop an image or click to select"
>
	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		onchange={handleFileSelect}
		class="hidden-input"
	/>

	<div class="dropzone-content">
		<svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
			<path d="M12 16V4m0 0L8 8m4-4l4 4" stroke-linecap="round" stroke-linejoin="round" />
			<path d="M3 20h18" stroke-linecap="round" />
		</svg>
		<p class="dropzone-text">Drop image here</p>
		<p class="dropzone-subtext">or click to select</p>
	</div>
</div>

<style>
	.dropzone {
		width: 100%;
		min-height: 280px;
		border: 2px dashed var(--border-color);
		border-radius: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
		background: var(--bg-secondary);
	}

	.dropzone:hover:not(.disabled) {
		border-color: var(--accent);
		background: var(--bg-tertiary);
	}

	.dropzone.dragging {
		border-color: var(--accent);
		background: var(--bg-tertiary);
		transform: scale(1.01);
	}

	.dropzone.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.dropzone:focus {
		outline: none;
		border-color: var(--accent);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
	}

	.hidden-input {
		display: none;
	}

	.dropzone-content {
		text-align: center;
		pointer-events: none;
	}

	.upload-icon {
		width: 48px;
		height: 48px;
		margin: 0 auto 16px;
		color: var(--text-secondary);
	}

	.dropzone-text {
		font-size: 1.125rem;
		font-weight: 500;
		color: var(--text-primary);
		margin: 0 0 4px;
	}

	.dropzone-subtext {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin: 0;
	}
</style>
