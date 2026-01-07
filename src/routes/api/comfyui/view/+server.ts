import type { RequestHandler } from './$types';
import { COMFY_API_URL } from '$env/static/private';

export const GET: RequestHandler = async ({ url }) => {
    try {
        const filename = url.searchParams.get('filename');
        const type = url.searchParams.get('type') || 'output';

        if (!filename) {
            return new Response(JSON.stringify({ error: 'Filename required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`Fetching image: ${COMFY_API_URL}/view?filename=${filename}&type=${type}`);

        // Use AbortController with longer timeout for large images
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

        const response = await fetch(`${COMFY_API_URL}/view?filename=${filename}&type=${type}`, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`ComfyUI view failed: ${response.status} ${response.statusText}`);
            return new Response(JSON.stringify({ error: 'Failed to get image', status: response.status }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const contentType = response.headers.get('content-type') || 'image/png';
        const contentLength = response.headers.get('content-length');

        console.log(`Image response: type=${contentType}, size=${contentLength}`);

        // Stream the response body directly instead of buffering
        if (response.body) {
            return new Response(response.body, {
                headers: {
                    'Content-Type': contentType,
                    ...(contentLength && { 'Content-Length': contentLength })
                }
            });
        }

        // Fallback to arrayBuffer if streaming not available
        const imageBuffer = await response.arrayBuffer();
        return new Response(imageBuffer, {
            headers: { 'Content-Type': contentType }
        });
    } catch (error) {
        console.error('View endpoint error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ error: 'Failed to connect to ComfyUI', details: message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
