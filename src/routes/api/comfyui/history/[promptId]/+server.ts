import type { RequestHandler } from './$types';
import { COMFY_API_URL } from '$env/static/private';

export const GET: RequestHandler = async ({ params }) => {
    try {
        const response = await fetch(`${COMFY_API_URL}/history/${params.promptId}`);

        if (!response.ok) {
            return new Response(JSON.stringify({ error: 'Failed to get history' }), {
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
