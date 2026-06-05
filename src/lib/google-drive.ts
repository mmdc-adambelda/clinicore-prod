import { google } from 'googleapis'
import { Readable } from 'stream'

function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

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

  const readable = new Readable()
  readable.push(buffer)
  readable.push(null)

  const uploaded = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
    },
    media: { mimeType, body: readable },
    fields: 'id, webViewLink, webContentLink, name',
  })

  const fileId = uploaded.data.id!

  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  })

  return { fileId, webViewLink: uploaded.data.webViewLink! }
}

export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const drive = getDriveClient()
  await drive.files.delete({ fileId })
}
