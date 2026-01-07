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

        const response = await fetch(`${COMFY_API_URL}/view?filename=${filename}&type=${type}`);

        if (!response.ok) {
            return new Response(JSON.stringify({ error: 'Failed to get image' }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const imageBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/png';

        return new Response(imageBuffer, {
            headers: { 'Content-Type': contentType }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to connect to ComfyUI' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
