<script lang="ts">
	interface Props {
		originalSrc: string;
		upscaledSrc: string;
	}

	let { originalSrc, upscaledSrc }: Props = $props();

	let sliderPosition = $state(50);
	let isDragging = $state(false);
	let isExpanded = $state(false);
	let isHovering = $state(false);
	let magnifyX = $state(0);
	let magnifyY = $state(0);
	let zoomLevel = $state(8);
	let containerRef: HTMLDivElement;

	const zoomLevels = [8, 16];

	function updatePosition(clientX: number) {
		if (!containerRef) return;
		const rect = containerRef.getBoundingClientRect();
		const x = clientX - rect.left;
		const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
		sliderPosition = percentage;
	}

	function updateMagnifyPosition(clientX: number, clientY: number) {
		if (!containerRef) return;
		const rect = containerRef.getBoundingClientRect();
		magnifyX = ((clientX - rect.left) / rect.width) * 100;
		magnifyY = ((clientY - rect.top) / rect.height) * 100;
	}

	function handleMouseDown(e: MouseEvent) {
		if ((e.target as HTMLElement).closest('.expand-btn') || (e.target as HTMLElement).closest('.zoom-select')) return;
		isDragging = true;
		updatePosition(e.clientX);
	}

	function handleMouseMove(e: MouseEvent) {
		if (isDragging) {
			updatePosition(e.clientX);
		}
		if (containerRef) {
			updateMagnifyPosition(e.clientX, e.clientY);
		}
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleMouseEnter() {
		isHovering = true;
	}

	function handleMouseLeave() {
		isHovering = false;
	}

	function handleTouchStart(e: TouchEvent) {
		if ((e.target as HTMLElement).closest('.expand-btn') || (e.target as HTMLElement).closest('.zoom-select')) return;
		isDragging = true;
		updatePosition(e.touches[0].clientX);
		updateMagnifyPosition(e.touches[0].clientX, e.touches[0].clientY);
		isHovering = true;
	}

	function handleTouchMove(e: TouchEvent) {
		if (isDragging) {
			e.preventDefault();
			updatePosition(e.touches[0].clientX);
		}
		updateMagnifyPosition(e.touches[0].clientX, e.touches[0].clientY);
	}

	function handleTouchEnd() {
		isDragging = false;
		isHovering = false;
	}

	function toggleExpand() {
		isExpanded = !isExpanded;
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isExpanded) {
			isExpanded = false;
		}
	}
</script>

<svelte:window
	onmousemove={handleMouseMove}
	onmouseup={handleMouseUp}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
	onkeydown={handleKeyDown}
/>

{#if isExpanded}
	<div class="overlay" onclick={toggleExpand} role="button" tabindex="-1"></div>
{/if}

<div
	class="compare-container"
	class:expanded={isExpanded}
	bind:this={containerRef}
	onmousedown={handleMouseDown}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	ontouchstart={handleTouchStart}
	role="slider"
	aria-label="Image comparison slider"
	aria-valuenow={sliderPosition}
	aria-valuemin={0}
	aria-valuemax={100}
	tabindex="0"
>
	<!-- Expand button -->
	<button class="expand-btn" onclick={toggleExpand} aria-label={isExpanded ? 'Collapse' : 'Expand'}>
		{#if isExpanded}
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		{:else}
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		{/if}
	</button>

	<!-- Upscaled (background) -->
	<img src={upscaledSrc} alt="Upscaled" class="compare-image upscaled" />

	<!-- Original (foreground, clipped) -->
	<div class="original-wrapper" style="clip-path: inset(0 {100 - sliderPosition}% 0 0);">
		<img src={originalSrc} alt="Original" class="compare-image original" />
	</div>

	<!-- Slider line -->
	<div class="slider-line" style="left: {sliderPosition}%;">
		<div class="slider-handle">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M8 12H16M8 12L10 10M8 12L10 14M16 12L14 10M16 12L14 14" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</div>
	</div>

	<!-- Labels -->
	<div class="label label-original">Original</div>
	<div class="label label-upscaled">Upscaled</div>

	<!-- Magnifier (bottom right, on hover) -->
	{#if isHovering}
		<div class="magnifier">
			<div class="magnifier-header">
				<span class="magnifier-title">🔍 {zoomLevel}x</span>
				<select class="zoom-select" bind:value={zoomLevel}>
					{#each zoomLevels as level}
						<option value={level}>{level}x</option>
					{/each}
				</select>
			</div>
			<div class="magnifier-content">
				<div class="magnifier-panel">
					<div class="magnifier-label">Original</div>
					<div class="magnifier-image-wrapper">
						<img 
							src={originalSrc} 
							alt="Original magnified" 
							class="magnifier-image"
							style="transform: scale({zoomLevel}); transform-origin: {magnifyX}% {magnifyY}%;"
						/>
					</div>
				</div>
				<div class="magnifier-divider"></div>
				<div class="magnifier-panel">
					<div class="magnifier-label">Upscaled</div>
					<div class="magnifier-image-wrapper">
						<img 
							src={upscaledSrc} 
							alt="Upscaled magnified" 
							class="magnifier-image"
							style="transform: scale({zoomLevel}); transform-origin: {magnifyX}% {magnifyY}%;"
						/>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.9);
		z-index: 999;
	}

	.compare-container {
		position: relative;
		width: 100%;
		aspect-ratio: auto;
		border-radius: 12px;
		overflow: hidden;
		cursor: ew-resize;
		user-select: none;
		background: var(--bg-secondary);
		transition: all 0.3s ease;
	}

	.compare-container.expanded {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 90vw;
		height: 90vh;
		max-width: 90vw;
		max-height: 90vh;
		z-index: 1000;
		border-radius: 16px;
	}

	.compare-image {
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
	}

	.original-wrapper {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.expand-btn {
		position: absolute;
		top: 12px;
		right: 12px;
		z-index: 10;
		width: 36px;
		height: 36px;
		padding: 8px;
		background: rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		color: white;
		cursor: pointer;
		transition: all 0.15s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.expand-btn:hover {
		background: rgba(0, 0, 0, 0.8);
		border-color: rgba(255, 255, 255, 0.4);
	}

	.expand-btn svg {
		width: 18px;
		height: 18px;
	}

	.slider-line {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 3px;
		background: white;
		transform: translateX(-50%);
		box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
	}

	.slider-handle {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 40px;
		height: 40px;
		background: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.slider-handle svg {
		width: 24px;
		height: 24px;
		color: var(--bg-primary);
	}

	.label {
		position: absolute;
		bottom: 16px;
		padding: 6px 12px;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: 6px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		z-index: 5;
	}

	.label-original {
		left: 16px;
	}

	.label-upscaled {
		right: 16px;
	}

	/* Magnifier */
	.magnifier {
		position: absolute;
		bottom: 16px;
		right: 16px;
		width: 480px;
		background: rgba(10, 10, 11, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		overflow: hidden;
		z-index: 20;
		backdrop-filter: blur(8px);
	}

	.magnifier-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.magnifier-title {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.zoom-select {
		padding: 4px 8px;
		font-size: 0.75rem;
		font-family: inherit;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		color: white;
		cursor: pointer;
	}

	.magnifier-content {
		display: flex;
	}

	.magnifier-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.magnifier-label {
		padding: 6px;
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--text-secondary);
		text-align: center;
		background: rgba(255, 255, 255, 0.03);
	}

	.magnifier-divider {
		width: 1px;
		background: rgba(255, 255, 255, 0.1);
	}

	.magnifier-image-wrapper {
		width: 100%;
		height: 200px;
		overflow: hidden;
		position: relative;
	}

	.magnifier-image {
		width: 100%;
		height: 100%;
		object-fit: contain;
		transition: transform-origin 0.1s ease;
	}
</style>
