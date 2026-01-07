import type { RequestHandler } from './$types';
import { COMFY_API_URL } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();

        const response = await fetch(`${COMFY_API_URL}/prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            return new Response(JSON.stringify({ error: 'Failed to queue prompt' }), {
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
