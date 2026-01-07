// ComfyUI API Service
// Uses server-side proxy to avoid CORS issues

import { PUBLIC_COMFY_WS_URL, PUBLIC_COMFY_API_URL } from '$env/static/public';

const COMFY_WS = PUBLIC_COMFY_WS_URL;
const COMFY_API = PUBLIC_COMFY_API_URL;

export interface UpscaleResult {
    success: boolean;
    imageUrl?: string;
    error?: string;
}

// Generate a unique client ID for WebSocket
function generateClientId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// Upload image via proxy
export async function uploadImage(file: File): Promise<{ name: string; subfolder: string }> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('overwrite', 'true');

    const response = await fetch('/api/comfyui/upload', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Failed to upload image to ComfyUI');
    }

    const result = await response.json();
    return { name: result.name, subfolder: result.subfolder || '' };
}

// Create SeedVR2 upscale workflow
function createUpscaleWorkflow(imageName: string, resolution: number) {
    return {
        '10': {
            inputs: {
                filename_prefix: 'upscaleapp',
                images: ['11', 0]
            },
            class_type: 'SaveImage',
            _meta: { title: 'Save Image' }
        },
        '11': {
            inputs: {
                seed: Math.floor(Math.random() * 1000000000),
                resolution: resolution,
                max_resolution: resolution,
                batch_size: 1,
                uniform_batch_size: false,
                color_correction: 'lab',
                temporal_overlap: 0,
                prepend_frames: 0,
                input_noise_scale: 0,
                latent_noise_scale: 0,
                offload_device: 'cpu',
                enable_debug: false,
                image: ['16', 0],
                dit: ['12', 0],
                vae: ['13', 0]
            },
            class_type: 'SeedVR2VideoUpscaler',
            _meta: { title: 'SeedVR2 Video Upscaler (v2.5.22)' }
        },
        '12': {
            inputs: {
                model: 'seedvr2_ema_7b_sharp_fp16.safetensors',
                device: 'cuda:0',
                blocks_to_swap: 36,
                swap_io_components: false,
                offload_device: 'cpu',
                cache_model: false,
                attention_mode: 'sdpa'
            },
            class_type: 'SeedVR2LoadDiTModel',
            _meta: { title: 'SeedVR2 (Down)Load DiT Model' }
        },
        '13': {
            inputs: {
                model: 'ema_vae_fp16.safetensors',
                device: 'cuda:0',
                encode_tiled: true,
                encode_tile_size: 1024,
                encode_tile_overlap: 128,
                decode_tiled: true,
                decode_tile_size: 1024,
                decode_tile_overlap: 128,
                tile_debug: 'false',
                offload_device: 'cpu',
                cache_model: false
            },
            class_type: 'SeedVR2LoadVAEModel',
            _meta: { title: 'SeedVR2 (Down)Load VAE Model' }
        },
        '16': {
            inputs: {
                image: imageName
            },
            class_type: 'LoadImage',
            _meta: { title: 'Load Image' }
        }
    };
}

// Queue prompt and wait for result via WebSocket
export async function upscaleImage(
    file: File,
    resolution: number = 4000,
    onProgress?: (status: string) => void
): Promise<UpscaleResult> {
    const clientId = generateClientId();

    try {
        // Upload the image first
        onProgress?.('Uploading image...');
        const { name } = await uploadImage(file);

        // Create the workflow
        const workflow = createUpscaleWorkflow(name, resolution);

        // Queue the prompt via proxy
        onProgress?.('Starting upscale...');
        const queueResponse = await fetch('/api/comfyui/prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: workflow,
                client_id: clientId
            })
        });

        if (!queueResponse.ok) {
            throw new Error('Failed to queue upscale prompt');
        }

        const { prompt_id } = await queueResponse.json();

        // Connect to WebSocket and wait for completion
        onProgress?.('Processing...');
        const resultFilename = await waitForCompletion(clientId, prompt_id, onProgress);

        // Return the result image URL - fetch directly from ComfyUI to bypass Netlify timeout
        return {
            success: true,
            imageUrl: `${COMFY_API}/view?filename=${resultFilename}&type=output`
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

// Wait for WebSocket completion message
function waitForCompletion(
    clientId: string,
    promptId: string,
    onProgress?: (status: string) => void
): Promise<string> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`${COMFY_WS}?clientId=${clientId}`);

        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Upscale timed out'));
        }, 300000); // 5 minute timeout for SeedVR2

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                if (message.type === 'progress') {
                    const { value, max } = message.data;
                    onProgress?.(`Processing... ${Math.round((value / max) * 100)}%`);
                }

                if (message.type === 'executing') {
                    if (message.data.node === null && message.data.prompt_id === promptId) {
                        // Execution complete, fetch the result
                        clearTimeout(timeout);
                        fetchOutputImage(promptId)
                            .then((filename) => {
                                ws.close();
                                resolve(filename);
                            })
                            .catch(reject);
                    }
                }

                if (message.type === 'execution_error') {
                    clearTimeout(timeout);
                    ws.close();
                    reject(new Error('Upscale execution failed'));
                }
            } catch {
                // Ignore parse errors
            }
        };

        ws.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('WebSocket connection failed'));
        };

        ws.onclose = () => {
            clearTimeout(timeout);
        };
    });
}

// Fetch the output image filename from history via proxy (with retries)
async function fetchOutputImage(promptId: string): Promise<string> {
    const maxRetries = 5;
    const retryDelay = 1000; // 1 second between retries

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Wait a bit before fetching (history may not be immediately available)
            if (attempt > 0) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }

            const response = await fetch(`/api/comfyui/history/${promptId}`);

            if (!response.ok) {
                console.error(`History fetch failed with status: ${response.status}`);
                continue;
            }

            const history = await response.json();
            console.log('History response:', JSON.stringify(history, null, 2));

            const outputs = history[promptId]?.outputs;

            if (!outputs) {
                console.log(`Attempt ${attempt + 1}: No outputs yet, retrying...`);
                continue;
            }

            // Find the SaveImage node output (node '10' in our workflow)
            for (const nodeId of Object.keys(outputs)) {
                const nodeOutput = outputs[nodeId];
                if (nodeOutput.images && nodeOutput.images.length > 0) {
                    console.log('Found output image:', nodeOutput.images[0]);
                    return nodeOutput.images[0].filename;
                }
            }

            console.log(`Attempt ${attempt + 1}: No images in outputs, retrying...`);
        } catch (error) {
            console.error(`Attempt ${attempt + 1} failed:`, error);
        }
    }

    throw new Error('No output image found after retries');
}

// Get image as blob for comparison
export async function getImageBlob(url: string): Promise<string> {
    console.log('Fetching image from:', url);
    const response = await fetch(url);

    if (!response.ok) {
        console.error('Image fetch failed:', response.status, response.statusText);
        throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();
    console.log('Image blob size:', blob.size, 'type:', blob.type);

    if (blob.size === 0) {
        throw new Error('Received empty image');
    }

    return URL.createObjectURL(blob);
}
