import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { type NextRequest, NextResponse } from 'next/server'

// This route handles Vercel Blob client-side uploads
// For large files (>4.5MB), the browser uploads directly to Blob storage
export async function POST(request: NextRequest): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname) => {
                // Validate the upload - you can add auth checks here
                return {
                    allowedContentTypes: [
                        'image/*',
                        'video/*',
                        'audio/*',
                        'application/*',
                        'text/*',
                        'font/*',
                    ],
                    maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
                    tokenPayload: JSON.stringify({
                        uploadedAt: Date.now(),
                    }),
                }
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                // This runs after the upload is complete
                // You can log or do post-processing here
                console.log('Blob upload completed:', blob.url)
            },
        })

        return NextResponse.json(jsonResponse)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Upload failed' },
            { status: 400 }
        )
    }
}
