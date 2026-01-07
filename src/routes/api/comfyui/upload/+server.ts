import type { RequestHandler } from './$types';
import { COMFY_API_URL } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const formData = await request.formData();

        const response = await fetch(`${COMFY_API_URL}/upload/image`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            return new Response(JSON.stringify({ error: 'Upload failed' }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const result = await response.json();
        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to connect to ComfyUI' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
