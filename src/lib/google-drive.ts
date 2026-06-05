import { google } from 'googleapis'
import { Readable } from 'stream'

function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      // .env.local stores the key with literal \n — convert to real newlines
      private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

/**
 * Returns the Drive folder ID for a given patientId, creating it if needed.
 * Folders are created inside GOOGLE_DRIVE_FOLDER_ID.
 */
export async function getOrCreatePatientFolder(patientId: string): Promise<string> {
  const drive = getDriveClient()
  const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID!

  const list = await drive.files.list({
    q: `name='${patientId}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  })

  if (list.data.files && list.data.files.length > 0) {
    return list.data.files[0].id!
  }

  const folder = await drive.files.create({
    requestBody: {
      name: patientId,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  })

  return folder.data.id!
}

export async function uploadFileToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string,
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDriveClient()

  const body = new Readable()
  body.push(buffer)
  body.push(null)

  const uploaded = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body },
    fields: 'id, webViewLink',
  })

  const fileId = uploaded.data.id!

  // Grant view access to anyone with the link so clinic staff can open it
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  })

  // webViewLink is already set during create, but fetch it back to be sure
  const meta = await drive.files.get({ fileId, fields: 'webViewLink' })

  return { fileId, webViewLink: meta.data.webViewLink! }
}

export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const drive = getDriveClient()
  await drive.files.delete({ fileId })
}
