<script lang="ts">
	import ImageDropzone from '$lib/components/ImageDropzone.svelte';
	import ImageCompare from '$lib/components/ImageCompare.svelte';
	import { upscaleImage, getImageBlob } from '$lib/comfyui';

	// Resolution options
	const resolutions = [
		{ label: '4K', value: 4000 },
		{ label: '5K', value: 5000 },
		{ label: '6K', value: 6000 }
	];

	// State
	let selectedFile: File | null = $state(null);
	let originalPreview: string | null = $state(null);
	let upscaledImage: string | null = $state(null);
	let isProcessing = $state(false);
	let statusMessage = $state('');
	let errorMessage = $state('');
	let selectedResolution = $state(4000);

	// Handle image selection
	function handleImageSelected(file: File, previewUrl: string) {
		selectedFile = file;
		originalPreview = previewUrl;
		upscaledImage = null;
		errorMessage = '';
	}

	// Start upscale process
	async function handleUpscale() {
		if (!selectedFile) return;

		isProcessing = true;
		errorMessage = '';
		statusMessage = 'Starting...';

		const result = await upscaleImage(selectedFile, selectedResolution, (status) => {
			statusMessage = status;
		});

		isProcessing = false;

		if (result.success && result.imageUrl) {
			// Fetch the image as blob for display
			try {
				upscaledImage = await getImageBlob(result.imageUrl);
				statusMessage = '';
			} catch {
				errorMessage = 'Failed to load upscaled image';
			}
		} else {
			errorMessage = result.error || 'Upscale failed';
		}
	}

	// Reset to start over
	function handleReset() {
		if (originalPreview) URL.revokeObjectURL(originalPreview);
		if (upscaledImage) URL.revokeObjectURL(upscaledImage);

		selectedFile = null;
		originalPreview = null;
		upscaledImage = null;
		statusMessage = '';
		errorMessage = '';
	}

	// Download upscaled image
	function handleDownload() {
		if (!upscaledImage) return;

		const a = document.createElement('a');
		a.href = upscaledImage;
		a.download = `upscaled_${selectedResolution}_${selectedFile?.name || 'image.png'}`;
		a.click();
	}
</script>

<main class="container">
	<header class="header">
		<h1 class="title">Upscale</h1>
		<p class="subtitle">AI-powered image upscaling</p>
	</header>

	<div class="content">
		{#if !originalPreview}
			<!-- Upload state -->
			<ImageDropzone onImageSelected={handleImageSelected} />
		{:else if !upscaledImage}
			<!-- Preview & process state -->
			<div class="preview-section">
				<div class="preview-image-wrapper">
					<img src={originalPreview} alt="Preview" class="preview-image" />
				</div>

				<!-- Resolution selector -->
				<div class="resolution-selector">
					<span class="resolution-label">Resolution</span>
					<div class="resolution-buttons">
						{#each resolutions as res}
							<button
								class="resolution-btn"
								class:active={selectedResolution === res.value}
								onclick={() => (selectedResolution = res.value)}
								disabled={isProcessing}
							>
								{res.label}
							</button>
						{/each}
					</div>
				</div>

				{#if isProcessing}
					<div class="status">
						<div class="spinner"></div>
						<span>{statusMessage}</span>
					</div>
				{:else if errorMessage}
					<div class="error">{errorMessage}</div>
				{/if}

				<div class="actions">
					<button class="btn btn-secondary" onclick={handleReset} disabled={isProcessing}>
						Cancel
					</button>
					<button class="btn btn-primary" onclick={handleUpscale} disabled={isProcessing}>
						{isProcessing ? 'Processing...' : 'Upscale'}
					</button>
				</div>
			</div>
		{:else}
			<!-- Result state -->
			<div class="result-section">
				<ImageCompare originalSrc={originalPreview} upscaledSrc={upscaledImage} />

				<div class="actions">
					<button class="btn btn-secondary" onclick={handleReset}>
						New Image
					</button>
					<button class="btn btn-primary" onclick={handleDownload}>
						Download
					</button>
				</div>
			</div>
		{/if}
	</div>
</main>

<style>
	.container {
		min-height: 100vh;
		max-width: 800px;
		margin: 0 auto;
		padding: 48px 24px;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.header {
		text-align: center;
		margin-bottom: 48px;
	}

	.title {
		font-size: 2.5rem;
		font-weight: 600;
		margin: 0;
		letter-spacing: -0.02em;
	}

	.subtitle {
		font-size: 1rem;
		color: var(--text-secondary);
		margin: 8px 0 0;
	}

	.content {
		width: 100%;
	}

	.preview-section,
	.result-section {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.preview-image-wrapper {
		background: var(--bg-secondary);
		border-radius: 12px;
		overflow: hidden;
	}

	.preview-image {
		width: 100%;
		height: auto;
		display: block;
	}

	/* Resolution selector */
	.resolution-selector {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
	}

	.resolution-label {
		font-size: 0.875rem;
		color: var(--text-secondary);
		font-weight: 500;
	}

	.resolution-buttons {
		display: flex;
		gap: 8px;
		background: var(--bg-secondary);
		padding: 4px;
		border-radius: 10px;
		border: 1px solid var(--border-color);
	}

	.resolution-btn {
		padding: 8px 20px;
		font-size: 0.875rem;
		font-weight: 600;
		font-family: inherit;
		background: transparent;
		border: none;
		border-radius: 8px;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.resolution-btn:hover:not(:disabled) {
		color: var(--text-primary);
		background: var(--bg-tertiary);
	}

	.resolution-btn.active {
		background: var(--accent);
		color: white;
	}

	.resolution-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.status {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		color: var(--text-secondary);
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid var(--border-color);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error {
		text-align: center;
		color: #ef4444;
		font-size: 0.875rem;
	}

	.actions {
		display: flex;
		gap: 12px;
		justify-content: center;
	}

	.btn {
		padding: 12px 28px;
		font-size: 0.9375rem;
		font-weight: 500;
		border: none;
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.15s ease;
		font-family: inherit;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background: var(--accent);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--accent-hover);
	}

	.btn-secondary {
		background: var(--bg-tertiary);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--bg-secondary);
		border-color: var(--text-secondary);
	}
</style>
