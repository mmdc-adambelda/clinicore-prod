import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrCreatePatientFolder, uploadFileToDrive, deleteFileFromDrive } from '@/lib/google-drive'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_BYTES = 50 * 1024 * 1024 // 50 MB
const VALID_FILE_TYPES = ['xray', 'lab_result'] as const

// POST /api/upload
// Body: multipart/form-data — file, patientId, fileType (xray | lab_result)
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file      = formData.get('file')      as File   | null
    const patientId = formData.get('patientId') as string | null
    const fileType  = formData.get('fileType')  as string | null

    if (!file || !patientId || !fileType) {
      return NextResponse.json(
        { error: 'Missing required fields: file, patientId, fileType' },
        { status: 400 },
      )
    }

    if (!VALID_FILE_TYPES.includes(fileType as typeof VALID_FILE_TYPES[number])) {
      return NextResponse.json(
        { error: 'fileType must be xray or lab_result' },
        { status: 400 },
      )
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPG, PNG, and PDF files are allowed' },
        { status: 400 },
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File exceeds the 50 MB limit' },
        { status: 400 },
      )
    }

    // Verify the patient belongs to this staff member's clinic (RLS enforces it in
    // the insert below, but an early check gives a clearer error message)
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .single()

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Upload to Google Drive
    const folderId = await getOrCreatePatientFolder(patientId)
    const buffer   = Buffer.from(await file.arrayBuffer())
    const { fileId, webViewLink } = await uploadFileToDrive(
      buffer,
      file.name,
      file.type,
      folderId,
    )

    // Persist metadata in Supabase (RLS enforces clinic isolation)
    const { data: record, error: dbError } = await supabase
      .from('patient_files')
      .insert({
        patient_id:  patientId,
        file_url:    webViewLink,
        file_id:     fileId,
        file_name:   file.name,
        file_type:   fileType,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (dbError) {
      // Best-effort cleanup of the Drive file so we don't leave orphans
      await deleteFileFromDrive(fileId).catch(() => null)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ fileId, webViewLink, record }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    console.error('[/api/upload POST]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/upload
// Body: JSON — { recordId: string }
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recordId } = await req.json() as { recordId?: string }
    if (!recordId) {
      return NextResponse.json({ error: 'Missing recordId' }, { status: 400 })
    }

    // Fetch the record (RLS ensures caller can only see their clinic's files)
    const { data: record } = await supabase
      .from('patient_files')
      .select('id, file_id')
      .eq('id', recordId)
      .single()

    if (!record) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Delete from Google Drive first
    await deleteFileFromDrive(record.file_id)

    // Then remove the DB record
    const { error: dbError } = await supabase
      .from('patient_files')
      .delete()
      .eq('id', recordId)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Delete failed'
    console.error('[/api/upload DELETE]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
