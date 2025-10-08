import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, ...chatRequest } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Forward the request to the Python backend
    const backendResponse = await fetch(
      `${BACKEND_URL}/api/sessions/${sessionId}/chat/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatRequest),
      }
    );

    if (!backendResponse.ok) {
      throw new Error(`Backend responded with status: ${backendResponse.status}`);
    }

    // Check if response body exists
    if (!backendResponse.body) {
      throw new Error('No response body from backend');
    }

    // Create a readable stream from the backend response
    const stream = new ReadableStream({
      start(controller) {
        const reader = backendResponse.body!.getReader();
        
        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }

            // Forward the chunk to the client
            controller.enqueue(value);
            return pump();
          }).catch((error) => {
            console.error('Stream reading error:', error);
            controller.error(error);
          });
        }

        return pump();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
    });
  } catch (error) {
    console.error('Streaming chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
